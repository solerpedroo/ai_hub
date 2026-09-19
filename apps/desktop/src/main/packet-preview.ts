import {
  appendFilesToPacket,
  appendMentionsToPacket,
  compileActivePathDetailed,
  mergePacketWithTail,
} from "@ai-hub/ai-gateway";
import { applyContextFirewall } from "@ai-hub/security";
import { randomUUID } from "node:crypto";
import {
  findCatalogModel,
  effectivePrivacyMode,
  mentionVisibleContent,
  packetPreviewResultSchema,
  packetV0Schema,
  portablePacketV1Schema,
  type PacketPreviewInput,
  type PacketPreviewResult,
} from "@ai-hub/shared";
import { loadSendAttachments } from "./files";
import { resolveSendMentions } from "./mentions";
import { getHubDatabase } from "./persistence";
import { loadAutoProjectContext } from "./project-context";
import { estimateOutgoingCostUsd, evaluateOutgoingCaps, evaluateScopedOutgoingCaps, localDayStartMs, spendCapLimitsFromRows } from "./spend-guard";

export function previewPacket(input: PacketPreviewInput): PacketPreviewResult {
  const repos = getHubDatabase().repos;
  const policy = repos.getAppPrefs().firewallPolicy;
  const firewallText = (text: string): string => {
    const result = applyContextFirewall(text, policy);
    if (result.blocked.length > 0) throw new Error(`firewall:blocked:${result.blocked.join(",")}`);
    return result.maskedText;
  };
  const conversation = repos.getConversation(input.conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }
  const project = conversation.projectId ? repos.getProject(conversation.projectId) : null;
  const extraSystem =
    input.extraSystem !== undefined && input.extraSystem.trim().length > 0 ? firewallText(input.extraSystem.trim()) : null;
  const catalog = findCatalogModel(input.model, input.providerSlug);
  const contextWindow = catalog?.contextWindow ?? 128_000;
  const path = repos.listActivePath(input.conversationId);
  const pending =
    input.pendingContent !== undefined && input.pendingContent.trim().length > 0
      ? firewallText(input.pendingContent.trim())
      : null;
  const leaf = path.at(-1);
  const pendingRow = pending
    ? {
        id: randomUUID(),
        parentId: leaf?.id ?? null,
        isActiveBranch: true,
        createdAt: new Date().toISOString(),
        role: "user" as const,
        content: pending,
        status: "complete" as const,
        pinned: false,
        branchId: leaf?.branchId ?? randomUUID(),
      }
    : null;
  const privacyMode = effectivePrivacyMode(repos.getAppPrefs().privacyMode);
  const appliedId = conversation.activePacketId;
  const applied = appliedId ? repos.getContextPacket(appliedId) : null;
  const budget = input.compact === true ? contextWindow : undefined;

  let tokenEstimate = 0;
  let excludedCount = 0;
  let included: PacketPreviewResult["included"] = [];
  let omitted: PacketPreviewResult["omitted"] = [];
  let resolvedPrivacy = privacyMode;
  let compiledPacket = packetV0Schema.parse({ version: 1, system: "", messages: [], tokenEstimate: 0, excluded: [] });

  if (
    applied &&
    applied.projectId === conversation.projectId &&
    effectivePrivacyMode(applied.privacyMode) === privacyMode
  ) {
    const envelope = portablePacketV1Schema.parse(JSON.parse(applied.payloadJson) as unknown);
    resolvedPrivacy = effectivePrivacyMode(envelope.privacyMode);
    const appliedAt = conversation.packetAppliedAt;
    const tail = [
      ...path.filter((item) => appliedAt !== null && item.createdAt >= appliedAt),
      ...(pendingRow ? [pendingRow] : []),
    ];
    const merged = mergePacketWithTail(
      envelope.payload,
      tail.map((item) => ({
        id: item.id,
        role: item.role,
        content: item.content,
        status: item.status,
        ...("pinned" in item && item.pinned ? { pinned: true } : {}),
      })),
      budget,
    );
    tokenEstimate = merged.packet.tokenEstimate;
    compiledPacket = merged.packet;
    excludedCount = merged.packet.excluded.length;
    included = merged.included;
    omitted = merged.omitted;
  } else {
    const all = repos.listMessages(input.conversationId);
    const messages = [
      ...all.map((item) => ({
        id: item.id,
        parentId: item.parentId,
        isActiveBranch: item.isActiveBranch,
        createdAt: item.createdAt,
        role: item.role,
        content: item.content,
        status: item.status,
        branchId: item.branchId,
        ...(item.pinned ? { pinned: true } : {}),
      })),
      ...(pendingRow
        ? [
            {
              id: pendingRow.id,
              parentId: pendingRow.parentId,
              isActiveBranch: true,
              createdAt: pendingRow.createdAt,
              role: pendingRow.role,
              content: pendingRow.content,
              status: pendingRow.status,
              branchId: pendingRow.branchId,
            },
          ]
        : []),
    ];
    const compiled = {
      projectInstructions: project?.instructions ?? null,
      extraSystem,
      messages,
      privacyMode,
    };
    const detailed = compileActivePathDetailed(
      budget !== undefined ? { ...compiled, maxTokenBudget: budget } : compiled,
    );
    tokenEstimate = detailed.packet.tokenEstimate;
    compiledPacket = detailed.packet;
    excludedCount = detailed.packet.excluded.length;
    included = detailed.included;
    omitted = detailed.omitted;
  }
  const resolvedMentions = resolveSendMentions(
    repos,
    input.mentions,
    conversation.projectId,
    input.conversationId,
    "preview",
    privacyMode,
  );
  const fileIds = privacyMode === "private" ? [] : [...new Set([...(input.fileIds ?? []), ...resolvedMentions.fileIds])];
  const attachments = loadSendAttachments(
    fileIds,
    conversation.projectId,
    catalog?.vision === true,
    "preview",
  );
  const safeFiles = attachments.files.map((file) => ({ ...file, text: firewallText(file.text) }));
  const lastUser = [...path].reverse().find((item) => item.role === "user")?.content ?? "";
  const rawQuery = pending ?? lastUser;
  const query = mentionVisibleContent(rawQuery) || rawQuery;
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
  const dummyPacket = {
    version: 1 as const,
    system: "",
    messages: [],
    tokenEstimate: 0,
    excluded: [],
  };
  const safeMentions = [...resolvedMentions.mentions, ...autoContext].map((mention) => ({ ...mention, text: firewallText(mention.text) }));
  const filesOnly = appendFilesToPacket(dummyPacket, safeFiles);
  const mentionsOnly = appendMentionsToPacket(dummyPacket, safeMentions);
  const composed = appendMentionsToPacket(appendFilesToPacket(compiledPacket, safeFiles).packet, safeMentions).packet;
  const safePacket = packetV0Schema.parse({
    ...composed,
    system: firewallText(composed.system),
    messages: composed.messages.map((message) => ({ ...message, content: firewallText(message.content) })),
    tokenEstimate: Math.ceil((firewallText(composed.system).length + composed.messages.reduce((sum, message) => sum + firewallText(message.content).length, 0)) / 4),
  });
  tokenEstimate = safePacket.tokenEstimate;
  included = [...included, ...filesOnly.included, ...mentionsOnly.included].slice(0, 200);

  const estimatedCostUsd = estimateOutgoingCostUsd(
    input.model,
    input.providerSlug,
    tokenEstimate,
    input.maxTokens ?? null,
  );
  const baseCap = evaluateOutgoingCaps({
    estimatedRequestUsd: estimatedCostUsd,
    daySpentUsd: repos.sumReceiptCostUsd({ sinceMs: localDayStartMs() }),
    globalSpentUsd: repos.sumReceiptCostUsd({}),
    limits: spendCapLimitsFromRows(repos.listSpendCaps()),
  });
  const scoped = repos.listScopedSpendCaps();
  const projectCap = evaluateScopedOutgoingCaps({
    estimatedRequestUsd: estimatedCostUsd,
    spentUsd: conversation.projectId ? repos.sumReceiptCostUsd({ projectId: conversation.projectId }) : "0.000000",
    limitUsd: conversation.projectId
      ? (scoped.find((item) => item.dimension === "project" && item.subjectId === conversation.projectId)?.limitUsd ?? null)
      : null,
    scope: "project",
  });
  const providerCap = evaluateScopedOutgoingCaps({
    estimatedRequestUsd: estimatedCostUsd,
    spentUsd: repos.sumReceiptCostUsd({ providerSlug: input.providerSlug }),
    limitUsd: scoped.find((item) => item.dimension === "provider" && item.subjectId === input.providerSlug)?.limitUsd ?? null,
    scope: "provider",
  });
  const cap = {
    blocked: baseCap.blocked ?? projectCap.blocked ?? providerCap.blocked,
    warnings: [...new Set([...baseCap.warnings, ...projectCap.warnings, ...providerCap.warnings])],
  };
  included = included.map((slice) => ({ ...slice, label: firewallText(slice.label) }));
  omitted = omitted.map((slice) => ({ ...slice, label: firewallText(slice.label) }));
  return packetPreviewResultSchema.parse({
    tokenEstimate,
    contextWindow,
    overflow: tokenEstimate > contextWindow,
    compacted: input.compact === true && excludedCount > 0,
    excludedCount,
    estimatedCostUsd,
    capWarnings: cap.warnings,
    capBlocked: cap.blocked,
    included,
    omitted,
    destinationModel: input.model,
    destinationProvider: input.providerSlug,
    privacyMode: resolvedPrivacy,
    appliedPacketId:
      applied &&
      applied.projectId === conversation.projectId &&
      effectivePrivacyMode(applied.privacyMode) === privacyMode
        ? applied.id
        : null,
  });
}
