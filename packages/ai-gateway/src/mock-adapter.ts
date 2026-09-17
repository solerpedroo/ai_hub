import { openaiCatalogModels } from "@ai-hub/shared";
import type {
  ChatStreamEvent,
  ChatStreamRequest,
  ModelRef,
  ProviderAdapter,
  ProviderCapabilities,
} from "./adapter";
import { GatewayError } from "./errors";

export const MOCK_ASSISTANT_TEXT = "Hello from mock";
export const MOCK_STREAM_PAUSE_MS = 400;

function waitForAbortOrTimeout(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new GatewayError("aborted", "aborted"));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new GatewayError("aborted", "aborted"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function createMockOpenAIAdapter(): ProviderAdapter {
  return {
    id: "openai",
    listModels: (): ModelRef[] =>
      openaiCatalogModels().map((model) => ({ id: model.id, label: model.label })),
    capabilities: (): ProviderCapabilities => ({ streaming: true, tools: false }),
    testConnection: async (): Promise<void> => {
      return;
    },
    chatStream: async function* chatStream(
      request: ChatStreamRequest,
    ): AsyncGenerator<ChatStreamEvent> {
      if (request.signal.aborted) {
        throw new GatewayError("aborted", "aborted");
      }
      yield { type: "delta", text: "Hello" };
      await waitForAbortOrTimeout(MOCK_STREAM_PAUSE_MS, request.signal);
      yield { type: "delta", text: " from mock" };
      if (request.signal.aborted) {
        throw new GatewayError("aborted", "aborted");
      }
      yield { type: "usage", tokensIn: 4, tokensOut: MOCK_ASSISTANT_TEXT.length };
    },
  };
}
