import { randomUUID } from "node:crypto";
import type { WebContents } from "electron";
import {
  composeReceipt,
  appendFilesToPacket,
  appendMentionsToPacket,
  compileActivePath,
  compilePacket,
  consumeCrashSafeStream,
  createMockOpenAIAdapter,
  estimateTokensFromChars,
  GatewayError,
  GatewayStreamError,
  gatewayErrorCode,
  mergePacketWithTail,
  resolveAdapter,
  withTransientRetry,
  type CompilerGraphMessage,
  type CompilerMessage,
  type ProviderAdapter,
} from "@ai-hub/ai-gateway";
import type { ConversationRecord, MessageRecord } from "@ai-hub/db";
import { stripAttachedFileBodiesForRenderer } from "@ai-hub/files";
import { applyContextFirewall, redactSecrets } from "@ai-hub/security";
import {
  activePath,
  addUsd,
  effortParams,
  ancestorsOf,
  chatEventSchema,
  findCatalogModel,
  effectivePrivacyMode,
  IpcChannel,
  mentionVisibleContent,
  packetV0Schema,
  portablePacketV1Schema,
  SpendCapError,
  suggestFallbackProvider,
  summarizeProviderHealth,
  type ChatEvent,
  type ChatSendInput,
  type ChatSendResult,
  type DebugSnapshot,
  type GatewayErrorCode,
  type ProviderAgnosticPacket,
} from "@ai-hub/shared";
import { recordDebugSnapshot } from "./debug-snapshot";
import { isE2eMode } from "./e2e-mode";
import { captureMessageArtifacts } from "./artifacts";
import { toMessageDto } from "./message-dto";
import { loadSendAttachments } from "./files";
import { resolveSendMentions } from "./mentions";
import { getHubDatabase } from "./persistence";
import { loadAutoProjectContext } from "./project-context";
import { estimateOutgoingCostUsd, evaluateOutgoingCaps, evaluateScopedOutgoingCaps, localDayStartMs, spendCapLimitsFromRows } from "./spend-guard";

interface ActiveRun {
  runId: string;
  conversationId: string;
  messageId: string;
  abort: AbortController;
  sender: WebContents;
  packetEstimate: number;
  startedAt: number;
  model: string;
  provider: string;
  reservationId: string | null;
}

const runs = new Map<string, ActiveRun>();
const runByConversation = new Map<string, string>();

/** Main-process-only Council hook. It is deliberately not part of the IPC schema. */
type PreparedChatSendInput = ChatSendInput & {
  __preparedPacket?: ProviderAgnosticPacket;
  __skipCaps?: boolean;
  __councilRole?: import("@ai-hub/shared").CouncilRole;
};

function adapterFor(slug: string, baseUrl: string | null): ProviderAdapter {
  if (isE2eMode()) {
    return createMockOpenAIAdapter();
  }
  if (slug === "custom") {
    if (baseUrl === null || baseUrl.length === 0) {
      throw new GatewayError("unknown", "gateway:unknown");
    }
    return resolveAdapter("custom", { baseUrl });
  }
  return resolveAdapter(slug);
}

function inspectablePacket(packet: ProviderAgnosticPacket): ProviderAgnosticPacket {
  const stripped = {
    ...packet,
    system: stripAttachedFileBodiesForRenderer(packet.system),
  };
  return packetV0Schema.parse(JSON.parse(redactSecrets(JSON.stringify(stripped))) as unknown);
}

function enforcePacketFirewall(packet: ProviderAgnosticPacket, policy: import("@ai-hub/security").FirewallPolicy): ProviderAgnosticPacket {
  const system = applyContextFirewall(packet.system, policy);
  const messages = packet.messages.map((message) => ({ ...message, outcome: applyContextFirewall(message.content, policy) }));
  const blocked = [...system.blocked, ...messages.flatMap((message) => message.outcome.blocked)];
  if (blocked.length > 0) throw new Error(`firewall:blocked:${[...new Set(blocked)].join(",")}`);
  const safeSystem = system.maskedText;
  const safeMessages = messages.map(({ role, outcome }) => ({ role, content: outcome.maskedText }));
  return packetV0Schema.parse({
    ...packet,
    system: safeSystem,
    messages: safeMessages,
    tokenEstimate: Math.ceil((safeSystem.length + safeMessages.reduce((sum, message) => sum + message.content.length, 0)) / 4),
  });
}

function emit(sender: WebContents, event: ChatEvent): void {
  if (sender.isDestroyed()) {
    return;
  }
  sender.send(IpcChannel.chatEvent, chatEventSchema.parse(event));
}

function writeReceipt(
  messageId: string,
  run: ActiveRun,
  tokensIn: number | null,
  tokensOut: number | null,
  outputChars: number,
  errorCode: GatewayErrorCode | null,
  reportedCostUsd: string | null,
): void {
  const composed = composeReceipt({
    provider: run.provider,
    model: run.model,
    tokensIn,
    tokensOut,
    estimatedIn: run.packetEstimate,
    estimatedOut: estimateTokensFromChars(outputChars),
    latencyMs: Math.max(0, Date.now() - run.startedAt),
    errorCode,
    reportedCostUsd,
  });
  getHubDatabase().repos.createReceipt({
    messageId,
    provider: composed.provider,
    model: composed.model,
    tokensIn: composed.tokensIn,
    tokensOut: composed.tokensOut,
    latencyMs: composed.latencyMs,
    costUsd: composed.costUsd,
    errorCode: composed.errorCode,
  });
}

export function abortChat(runId: string): void {
  runs.get(runId)?.abort.abort();
}

export async function waitForChatRun(runId: string): Promise<void> {
  while (runs.has(runId)) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

function compilerMessages(rows: MessageRecord[]): CompilerMessage[] {
  return rows.map((item) => ({
    id: item.id,
    role: item.role,
    content: item.content,
    status: item.status,
    ...(item.pinned ? { pinned: true } : {}),
  }));
}

function compilerGraphMessages(rows: MessageRecord[]): CompilerGraphMessage[] {
  return rows.map((item) => ({
    id: item.id,
    parentId: item.parentId,
    isActiveBranch: item.isActiveBranch,
    createdAt: item.createdAt,
    role: item.role,
    content: item.content,
    status: item.status,
    branchId: item.branchId,
    ...(item.pinned ? { pinned: true } : {}),
  }));
}

function compileOutgoing(
  input: ChatSendInput,
  projectInstructions: string | null,
  compileRows: MessageRecord[],
  providerSlug: string,
  conversation: ConversationRecord,
): ProviderAgnosticPacket {
  const extraSystem =
    input.extraSystem !== undefined && input.extraSystem.trim().length > 0 ? input.extraSystem.trim() : null;
  const catalog = findCatalogModel(input.model, providerSlug);
  const maxTokenBudget =
    input.compactHistory === true ? (catalog?.contextWindow ?? 128_000) : undefined;
  const privacyMode = input.privacyMode ?? "standard";
  if (conversation.activePacketId) {
    const stored = getHubDatabase().repos.getContextPacket(conversation.activePacketId);
    if (
      stored &&
      stored.projectId === conversation.projectId &&
      effectivePrivacyMode(stored.privacyMode) === effectivePrivacyMode(input.privacyMode)
    ) {
      const envelope = portablePacketV1Schema.parse(JSON.parse(stored.payloadJson) as unknown);
      const appliedAt = conversation.packetAppliedAt;
      const tail = activePath(compileRows).filter(
        (item) => appliedAt !== null && item.createdAt >= appliedAt,
      );
      return mergePacketWithTail(envelope.payload, compilerMessages(tail), maxTokenBudget).packet;
    }
  }
  if (input.mode === "regenerate") {
    const compiled = {
      projectInstructions,
      extraSystem,
      privacyMode,
      messages: compilerMessages(compileRows),
    };
    return compilePacket(
      maxTokenBudget !== undefined ? { ...compiled, maxTokenBudget } : compiled,
    );
  }
  const compiled = {
    projectInstructions,
    extraSystem,
    privacyMode,
    messages: compilerGraphMessages(compileRows),
  };
  return compileActivePath(
    maxTokenBudget !== undefined ? { ...compiled, maxTokenBudget } : compiled,
  );
}

function pendingUser(
  conversationId: string,
  content: string,
  parentId: string | null,
  branchId: string,
): MessageRecord {
  return {
    id: randomUUID(),
    conversationId,
    parentId,
    branchId,
    isActiveBranch: true,
    role: "user",
    content,
    status: "complete",
    createdAt: new Date().toISOString(),
    receipt: null,
    pinned: false,
  };
}

function snapshotDecision(blocked: string | null, warnings: string[], allowOnce: boolean): DebugSnapshot["capDecision"] {
  if (allowOnce && blocked) {
    return "override";
  }
  if (blocked) {
    return "block";
  }
  if (warnings.length > 0) {
    return "warn";
  }
  return "ok";
}

export async function sendChat(input: PreparedChatSendInput, sender: WebContents): Promise<ChatSendResult> {
  const repos = getHubDatabase().repos;
  const prefs = repos.getAppPrefs();
  if (input.mode === "send" || input.mode === "edit") {
    const firewall = applyContextFirewall(input.content, prefs.firewallPolicy);
    if (firewall.blocked.length > 0) {
      throw new Error(`firewall:blocked:${firewall.blocked.join(",")}`);
    }
    if (firewall.maskedText !== input.content) {
      input = { ...input, content: firewall.maskedText };
    }
  }
  input = { ...input, privacyMode: prefs.privacyMode };
  if (runByConversation.has(input.conversationId)) {
    throw new Error("A stream is already running in this conversation");
  }

  const conversation = repos.getConversation(input.conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const key = await repos.getProviderSecret(input.providerKeyId);
  if (!key) {
    throw new GatewayError("auth", "gateway:auth");
  }
  if (key.providerSlug === "custom") {
    if (input.model.trim().length === 0) {
      throw new Error("unknown_model");
    }
  } else if (!findCatalogModel(input.model, key.providerSlug)) {
    throw new Error("unknown_model");
  }

  const adapter = adapterFor(key.providerSlug, repos.getCustomBaseUrl(key.id));

  const existing = repos.listMessages(input.conversationId);
  if (existing.some((item) => item.status === "streaming")) {
    throw new Error("A stream is already running in this conversation");
  }

  let compileRows: MessageRecord[] = [];
  let persistUser: (() => MessageRecord | null) | null = null;
  let assistantParentId: string | null = null;
  let assistantBranchId: string | null = null;

  switch (input.mode) {
    case "send": {
      const leaf = activePath(existing).at(-1);
      const branchId = leaf?.branchId ?? randomUUID();
      const content = mentionVisibleContent(input.content) || input.content;
      const draft = pendingUser(input.conversationId, content, leaf?.id ?? null, branchId);
      compileRows = [...existing, draft];
      persistUser = () =>
        repos.createMessage({
          conversationId: input.conversationId,
          role: "user",
          content,
          parentId: leaf?.id ?? null,
          branchId: leaf?.branchId ?? null,
        });
      assistantParentId = "pending";
      assistantBranchId = branchId;
      break;
    }
    case "continue": {
      compileRows = repos.listActivePath(input.conversationId);
      const leaf = compileRows.at(-1);
      if (!leaf) {
        throw new Error("Add a user message before sending");
      }
      persistUser = () => null;
      assistantParentId = leaf.id;
      assistantBranchId = leaf.branchId;
      break;
    }
    case "regenerate": {
      const target = repos.getMessage(input.messageId);
      if (!target || target.conversationId !== input.conversationId || target.role !== "assistant") {
        throw new Error("Assistant message not found");
      }
      if (target.status === "streaming") {
        throw new Error("A stream is already running in this conversation");
      }
      const path = activePath(existing);
      const index = path.findIndex((item) => item.id === target.id);
      compileRows =
        index >= 0 ? path.slice(0, index) : ancestorsOf(existing, target.id).slice(1).reverse();
      persistUser = () => null;
      assistantParentId = target.parentId;
      assistantBranchId = randomUUID();
      break;
    }
    case "edit": {
      const target = repos.getMessage(input.messageId);
      if (!target || target.conversationId !== input.conversationId || target.role !== "user") {
        throw new Error("User message not found");
      }
      const branchId = randomUUID();
      const content = mentionVisibleContent(input.content) || input.content;
      const draft = pendingUser(input.conversationId, content, target.parentId, branchId);
      compileRows = existing
        .map((item) => (item.id === target.id ? { ...item, isActiveBranch: false } : item))
        .concat(draft);
      persistUser = () =>
        repos.createMessage({
          conversationId: input.conversationId,
          role: "user",
          content,
          parentId: target.parentId,
          branchId,
        });
      assistantParentId = "pending";
      assistantBranchId = branchId;
      break;
    }
    default: {
      const _never: never = input;
      throw new Error(`Unknown send mode: ${String(_never)}`);
    }
  }

  const project = conversation.projectId ? repos.getProject(conversation.projectId) : null;
  const catalogForVision = findCatalogModel(input.model, key.providerSlug);
  const privacyMode = effectivePrivacyMode(prefs.privacyMode);
  const resolvedMentions = resolveSendMentions(
    repos,
    input.mentions,
    conversation.projectId,
    input.conversationId,
    "send",
    privacyMode,
  );
  const fileIds = privacyMode === "private" ? [] : [...new Set([...(input.fileIds ?? []), ...resolvedMentions.fileIds])];
  const attachments = loadSendAttachments(
    fileIds,
    conversation.projectId,
    catalogForVision?.vision === true,
    "send",
  );
  const compiled = compileOutgoing(
    input,
    project?.instructions ?? null,
    compileRows,
    key.providerSlug,
    conversation,
  );
  const query =
    input.mode === "send" || input.mode === "edit"
      ? mentionVisibleContent(input.content) || input.content
      : (compileRows.filter((item) => item.role === "user").at(-1)?.content ?? "");
  const skipMemoryIds = new Set(
    resolvedMentions.mentions.filter((item) => item.kind === "memory").map((item) => item.id),
  );
  const autoContext = loadAutoProjectContext(
    repos,
    conversation.projectId,
    query,
    privacyMode,
    skipMemoryIds,
  );
  const withFiles = appendFilesToPacket(compiled, attachments.files);
  const compiledPacket = enforcePacketFirewall(appendMentionsToPacket(withFiles.packet, [
    ...resolvedMentions.mentions,
    ...autoContext,
  ]).packet, prefs.firewallPolicy);
  const packet = input.__preparedPacket
    ? input.__preparedPacket
    : compiledPacket;
  if (packet.messages.length === 0) {
    throw new Error("Add a user message before sending");
  }

  const catalog = findCatalogModel(input.model, key.providerSlug);
  const contextWindow = catalog?.contextWindow ?? 128_000;
  const overflow = packet.tokenEstimate > contextWindow;
  if (overflow) {
    throw new GatewayError("context_overflow", "gateway:context_overflow");
  }

  const estimatedCostUsd = estimateOutgoingCostUsd(
    input.model,
    key.providerSlug,
    packet.tokenEstimate,
    input.maxTokens ?? (input.effortLevel ? effortParams(input.effortLevel).maxTokens : null),
  );
  const limits = spendCapLimitsFromRows(repos.listSpendCaps());
  const daySpentUsd = addUsd(repos.sumReceiptCostUsd({ sinceMs: localDayStartMs() }), repos.sumReservedSpendUsd({ sinceMs: localDayStartMs() }));
  const globalSpentUsd = addUsd(repos.sumReceiptCostUsd({}), repos.sumReservedSpendUsd({}));
  const baseCap = evaluateOutgoingCaps({
    estimatedRequestUsd: estimatedCostUsd,
    daySpentUsd,
    globalSpentUsd,
    limits,
  });
  const scoped = repos.listScopedSpendCaps();
  const projectCapLimit = conversation.projectId
    ? (scoped.find((item) => item.dimension === "project" && item.subjectId === conversation.projectId)?.limitUsd ?? null)
    : null;
  const providerCapLimit =
    scoped.find((item) => item.dimension === "provider" && item.subjectId === key.providerSlug)?.limitUsd ?? null;
  const projectCap = evaluateScopedOutgoingCaps({
    estimatedRequestUsd: estimatedCostUsd,
    spentUsd: conversation.projectId ? addUsd(repos.sumReceiptCostUsd({ projectId: conversation.projectId }), repos.sumReservedSpendUsd({ projectId: conversation.projectId })) : "0.000000",
    limitUsd: projectCapLimit,
    scope: "project",
  });
  const providerCap = evaluateScopedOutgoingCaps({
    estimatedRequestUsd: estimatedCostUsd,
    spentUsd: addUsd(repos.sumReceiptCostUsd({ providerSlug: key.providerSlug }), repos.sumReservedSpendUsd({ providerSlug: key.providerSlug })),
    limitUsd: providerCapLimit,
    scope: "provider",
  });
  const cap = {
    blocked: baseCap.blocked ?? projectCap.blocked ?? providerCap.blocked,
    warnings: [...new Set([...baseCap.warnings, ...projectCap.warnings, ...providerCap.warnings])],
  };
  const allowOnce = input.allowOnce === true;
  recordDebugSnapshot({
    at: new Date().toISOString(),
    provider: key.providerSlug,
    model: input.model,
    retries: 0,
    lastErrorCode: null,
    tokenEstimate: packet.tokenEstimate,
    estimatedCostUsd,
    capDecision: snapshotDecision(cap.blocked, cap.warnings, allowOnce),
    capScope: cap.blocked,
    overflow,
  });
  if (cap.blocked && !allowOnce && !input.__skipCaps) {
    throw new SpendCapError(cap.blocked);
  }
  if (cap.blocked && allowOnce && !input.__skipCaps) {
    const overriddenLimit =
      cap.blocked === "project"
        ? projectCapLimit
        : cap.blocked === "provider"
          ? providerCapLimit
          : limits[cap.blocked];
    repos.appendSpendCapOverride({
      at: new Date().toISOString(),
      scope: cap.blocked,
      limitUsd: overriddenLimit ?? "0",
      estimatedUsd: estimatedCostUsd,
      conversationId: input.conversationId,
      model: input.model,
      provider: key.providerSlug,
    });
  }
  const reservationId = !input.__skipCaps && estimatedCostUsd !== null
    ? repos.reserveSpend({ projectId: conversation.projectId, providerSlug: key.providerSlug, amountUsd: estimatedCostUsd, expiresAt: Date.now() + 15 * 60_000 })
    : null;

  console.info("[hub:packet]", {
    tokens: packet.tokenEstimate,
    messages: packet.messages.length,
    systemChars: packet.system.length,
  });
  const publicPacket = inspectablePacket(packet);

  const userMessage = persistUser ? persistUser() : null;
  if (assistantParentId === "pending") {
    if (!userMessage) {
      throw new Error("Add a user message before sending");
    }
    assistantParentId = userMessage.id;
    assistantBranchId = userMessage.branchId;
  }

  const assistant = repos.createMessage({
    conversationId: input.conversationId,
    role: "assistant",
    content: "",
    parentId: assistantParentId,
    branchId: assistantBranchId,
    status: "streaming",
  });
  repos.createReceipt({
    messageId: assistant.id,
    provider: key.providerSlug,
    model: input.model,
    tokensIn: null,
    tokensOut: null,
    latencyMs: null,
    costUsd: null,
    errorCode: null,
  });
  const assistantStored = repos.getMessage(assistant.id) ?? assistant;

  const runId = randomUUID();
  const run: ActiveRun = {
    runId,
    conversationId: input.conversationId,
    messageId: assistant.id,
    abort: new AbortController(),
    sender,
    packetEstimate: packet.tokenEstimate,
    startedAt: Date.now(),
    model: input.model,
    provider: key.providerSlug,
    reservationId,
  };
  runs.set(runId, run);
  runByConversation.set(input.conversationId, runId);

  const secret = key.secret;
  void (async () => {
    let retries = 0;
    try {
      let streamed = false;
      const result = await withTransientRetry({
        maxAttempts: 3,
        signal: run.abort.signal,
        didStream: () => streamed,
        onRetry: (nextRetries, code) => {
          retries = nextRetries;
          recordDebugSnapshot({
            at: new Date().toISOString(),
            provider: run.provider,
            model: run.model,
            retries,
            lastErrorCode: code,
            tokenEstimate: packet.tokenEstimate,
            estimatedCostUsd,
            capDecision: snapshotDecision(cap.blocked, cap.warnings, allowOnce),
            capScope: cap.blocked,
            overflow,
          });
        },
        run: async () => {
          streamed = false;
          let streamedTextLength = 0;
          return consumeCrashSafeStream({
            stream: adapter.chatStream({
              secret,
              model: input.model,
              packet: input.runMode === "plan"
                ? { ...packet, system: `${packet.system}\n\nExecution mode: plan. Return an inspectable plan with assumptions, steps, and validation criteria. Do not perform side effects or tool actions.` }
                : packet,
              signal: run.abort.signal,
              temperature: input.temperature ?? (input.effortLevel ? effortParams(input.effortLevel).temperature : 1),
              maxTokens: input.maxTokens ?? (input.effortLevel ? effortParams(input.effortLevel).maxTokens : null),
              ...(input.effortLevel ? { effortLevel: input.effortLevel } : {}),
              ...(input.effortLevel && adapter.capabilities().thinking
                ? { thinkingBudget: effortParams(input.effortLevel).thinkingBudget }
                : {}),
              ...(attachments.images.length > 0 ? { images: attachments.images } : {}),
              ...(input.__councilRole ? { councilRole: input.__councilRole } : {}),
            }),
            onDelta: (text) => {
              streamed = true;
              streamedTextLength += text.length;
              emit(run.sender, {
                type: "chunk",
                runId,
                messageId: assistant.id,
                text,
              });
              emit(run.sender, { type: "usage", runId, messageId: assistant.id, tokensIn: packet.tokenEstimate, tokensOut: estimateTokensFromChars(streamedTextLength), tokensThinking: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: null, thinkingSupported: adapter.capabilities().thinking });
            },
            onFlush: (content) => {
              repos.updateMessage(assistant.id, content, "streaming");
            },
          });
        },
      });
      repos.updateMessage(assistant.id, result.content, "complete");
      emit(run.sender, { type: "usage", runId, messageId: assistant.id, tokensIn: result.tokensIn ?? packet.tokenEstimate, tokensOut: result.tokensOut ?? estimateTokensFromChars(result.content.length), tokensThinking: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: result.costUsd, thinkingSupported: adapter.capabilities().thinking });
      try {
        captureMessageArtifacts(repos, assistant.id);
      } catch {
        // Artifact capture must not flip a completed stream to interrupted.
      }
      writeReceipt(assistant.id, run, result.tokensIn, result.tokensOut, result.content.length, null, result.costUsd);
      repos.recordHealthSample({
        providerSlug: run.provider,
        ok: true,
        latencyMs: Math.max(0, Date.now() - run.startedAt),
      });
      const stored = repos.getMessage(assistant.id);
      if (!stored) {
        throw new Error("Message not found");
      }
      recordDebugSnapshot({
        at: new Date().toISOString(),
        provider: run.provider,
        model: run.model,
        retries,
        lastErrorCode: null,
        tokenEstimate: packet.tokenEstimate,
        estimatedCostUsd,
        capDecision: snapshotDecision(cap.blocked, cap.warnings, allowOnce),
        capScope: cap.blocked,
        overflow,
      });
      emit(run.sender, {
        type: "done",
        runId,
        message: toMessageDto(stored),
        packet: publicPacket,
      });
    } catch (error) {
      const code: GatewayErrorCode = run.abort.signal.aborted
        ? "aborted"
        : gatewayErrorCode(error);
      const status = code === "aborted" ? "aborted" : "interrupted";
      const streamed = error instanceof GatewayStreamError ? error : null;
      const current = repos.getMessage(assistant.id);
      const content = streamed?.content ?? current?.content ?? "";
      repos.updateMessage(assistant.id, content, status);
      writeReceipt(
        assistant.id,
        run,
        streamed?.tokensIn ?? null,
        streamed?.tokensOut ?? null,
        content.length,
        code,
        streamed?.costUsd ?? null,
      );
      if (code !== "aborted") {
        repos.recordHealthSample({
          providerSlug: run.provider,
          ok: false,
          latencyMs: Math.max(0, Date.now() - run.startedAt),
        });
      }
      const keys = await repos.listProviderKeys();
      const suggestion =
        code === "aborted"
          ? null
          : suggestFallbackProvider({
              failedProvider: run.provider,
              keys,
              summaries: summarizeProviderHealth(repos.listRecentHealthSamples()),
            });
      recordDebugSnapshot({
        at: new Date().toISOString(),
        provider: run.provider,
        model: run.model,
        retries,
        lastErrorCode: code,
        tokenEstimate: packet.tokenEstimate,
        estimatedCostUsd,
        capDecision: snapshotDecision(cap.blocked, cap.warnings, allowOnce),
        capScope: cap.blocked,
        overflow,
      });
      emit(run.sender, {
        type: "error",
        runId,
        messageId: assistant.id,
        code,
        suggestProviderSlug: suggestion?.providerSlug ?? null,
        suggestKeyId: suggestion?.keyId ?? null,
        suggestModel: suggestion?.model ?? null,
      });
    } finally {
      if (run.reservationId) {
        repos.releaseSpendReservation(run.reservationId);
      }
      runs.delete(runId);
      runByConversation.delete(input.conversationId);
    }
  })();

  return {
    runId,
    messageId: assistant.id,
    userMessageId: userMessage?.id ?? null,
    packet: publicPacket,
    userMessage: userMessage ? toMessageDto(userMessage) : null,
    assistant: toMessageDto(assistantStored),
  };
}
