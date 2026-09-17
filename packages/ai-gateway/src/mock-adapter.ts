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
      yield { type: "delta", text: MOCK_ASSISTANT_TEXT };
      if (request.signal.aborted) {
        throw new GatewayError("aborted", "aborted");
      }
      yield { type: "usage", tokensIn: 4, tokensOut: MOCK_ASSISTANT_TEXT.length };
    },
  };
}
