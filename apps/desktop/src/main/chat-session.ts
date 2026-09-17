import { randomUUID } from "node:crypto";
import type { WebContents } from "electron";
import {
  composeReceipt,
  compilePacket,
  consumeCrashSafeStream,
  createOpenAIAdapter,
  estimateTokensFromChars,
  GatewayError,
  GatewayStreamError,
  gatewayErrorCode,
} from "@ai-hub/ai-gateway";
import { redactSecrets } from "@ai-hub/security";
import {
  chatEventSchema,
  findCatalogModel,
  IpcChannel,
  packetV0Schema,
  type ChatEvent,
  type ChatSendInput,
  type ChatSendResult,
  type GatewayErrorCode,
  type ProviderAgnosticPacket,
} from "@ai-hub/shared";
import { getHubDatabase } from "./persistence";
import { toMessageDto } from "./message-dto";

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
}

const runs = new Map<string, ActiveRun>();
const runByConversation = new Map<string, string>();
const openai = createOpenAIAdapter();

function inspectablePacket(packet: ProviderAgnosticPacket): ProviderAgnosticPacket {
  return packetV0Schema.parse(JSON.parse(redactSecrets(JSON.stringify(packet))) as unknown);
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

export async function sendChat(input: ChatSendInput, sender: WebContents): Promise<ChatSendResult> {
  const repos = getHubDatabase().repos;
  if (runByConversation.has(input.conversationId)) {
    throw new Error("A stream is already running in this conversation");
  }

  const conversation = repos.getConversation(input.conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (!findCatalogModel(input.model, "openai")) {
    throw new Error("Unknown model");
  }

  const key = await repos.getProviderSecret(input.providerKeyId);
  if (!key) {
    throw new GatewayError("auth", "Provider key is missing");
  }
  if (key.providerSlug !== "openai") {
    throw new Error("Only OpenAI is available in this wave");
  }

  const history = repos.listMessages(input.conversationId);
  if (history.some((item) => item.status === "streaming")) {
    throw new Error("A stream is already running in this conversation");
  }

  const project = conversation.projectId ? repos.getProject(conversation.projectId) : null;
  const packet = compilePacket({
    projectInstructions: project?.instructions ?? null,
    extraSystem: null,
    messages: history.map((item) => ({
      id: item.id,
      role: item.role,
      content: item.content,
      status: item.status,
    })),
  });
  if (packet.messages.length === 0) {
    throw new Error("Add a user message before sending");
  }

  console.info("[hub:packet]", redactSecrets(JSON.stringify(packet)));
  const publicPacket = inspectablePacket(packet);

  const last = history[history.length - 1];
  const assistant = repos.createMessage({
    conversationId: input.conversationId,
    role: "assistant",
    content: "",
    parentId: last?.id ?? null,
    branchId: last?.branchId ?? null,
    status: "streaming",
  });
  repos.createReceipt({
    messageId: assistant.id,
    provider: "openai",
    model: input.model,
    tokensIn: null,
    tokensOut: null,
    latencyMs: null,
    costUsd: null,
    errorCode: null,
  });

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
    provider: "openai",
  };
  runs.set(runId, run);
  runByConversation.set(input.conversationId, runId);

  const secret = key.secret;
  void (async () => {
    try {
      const result = await consumeCrashSafeStream({
        stream: openai.chatStream({
          secret,
          model: input.model,
          packet,
          signal: run.abort.signal,
        }),
        onDelta: (text) => {
          emit(run.sender, {
            type: "chunk",
            runId,
            messageId: assistant.id,
            text,
          });
        },
        onFlush: (content) => {
          repos.updateMessage(assistant.id, content, "streaming");
        },
      });
      repos.updateMessage(assistant.id, result.content, "complete");
      writeReceipt(assistant.id, run, result.tokensIn, result.tokensOut, result.content.length, null);
      const stored = repos.getMessage(assistant.id);
      if (!stored) {
        throw new Error("Message not found");
      }
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
      );
      emit(run.sender, {
        type: "error",
        runId,
        messageId: assistant.id,
        code,
      });
    } finally {
      runs.delete(runId);
      runByConversation.delete(input.conversationId);
    }
  })();

  return { runId, messageId: assistant.id, packet: publicPacket };
}
