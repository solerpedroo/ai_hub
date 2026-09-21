import { catalogModelsForProvider } from "@ai-hub/shared";
import type {
  ChatStreamEvent,
  ChatStreamRequest,
  ModelRef,
  ProviderAdapter,
  ProviderCapabilities,
} from "./adapter";
import { GatewayError } from "./errors";

export const MOCK_ASSISTANT_TEXT = "Hello from mock";
export const MOCK_SKILL_REVIEW_TEXT = `# Code Review

## Summary
The attached diff is internally consistent for the fixture.

## Risks
- None found in the fixture.

## Suggestions
- Keep this heading format for future reviews.
`;
export const MOCK_MERMAID_TEXT = `Here is the architecture.

\`\`\`mermaid
flowchart LR
  A[Composer] --> B[Compiler]
  B --> C[Gateway]
\`\`\`
`;
export const MOCK_STREAM_PAUSE_MS = 400;

function waitForAbortOrTimeout(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(new GatewayError("aborted", "aborted"));
  }
  return new Promise((resolve, reject) => {
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

function mockReply(packet: { system?: string; messages: Array<{ role: string; content: string }> }): string {
  if (packet.system && /Applied skill: Code Review/i.test(packet.system)) {
    return MOCK_SKILL_REVIEW_TEXT;
  }
  const lastUser = [...packet.messages].reverse().find((item) => item.role === "user");
  if (lastUser && /desenhe a arquitetura|draw the architecture/i.test(lastUser.content)) {
    return MOCK_MERMAID_TEXT;
  }
  return MOCK_ASSISTANT_TEXT;
}

function splitReply(text: string): [string, string] {
  if (text === MOCK_ASSISTANT_TEXT) {
    return ["Hello", " from mock"];
  }
  if (text === MOCK_SKILL_REVIEW_TEXT) {
    return [text.slice(0, text.indexOf("## Risks")), text.slice(text.indexOf("## Risks"))];
  }
  const cut = text.indexOf("```mermaid");
  if (cut > 0) {
    return [text.slice(0, cut), text.slice(cut)];
  }
  return [text.slice(0, Math.min(12, text.length)), text.slice(Math.min(12, text.length))];
}

export function createMockOpenAIAdapter(): ProviderAdapter {
  return {
    id: "mock",
    listModels: (): ModelRef[] =>
      catalogModelsForProvider("openai").map((model) => ({ id: model.id, label: model.label })),
    capabilities: (): ProviderCapabilities => ({ streaming: true, tools: false, thinking: false }),
    testConnection: async (): Promise<void> => {
      return;
    },
    chatStream: async function* chatStream(
      request: ChatStreamRequest,
    ): AsyncGenerator<ChatStreamEvent> {
      if (request.signal.aborted) {
        throw new GatewayError("aborted", "aborted");
      }
      const text = mockReply(request.packet);
      const [first, second] = splitReply(text);
      yield { type: "delta", text: first };
      await waitForAbortOrTimeout(MOCK_STREAM_PAUSE_MS, request.signal);
      yield { type: "delta", text: second };
      if (request.signal.aborted) {
        throw new GatewayError("aborted", "aborted");
      }
      yield { type: "usage", tokensIn: 4, tokensOut: text.length };
    },
  };
}
