import { describe, expect, it } from "vitest";
import { GatewayError } from "./errors";
import { createOpenRouterAdapter } from "./openrouter-adapter";
import { resolveAdapter } from "./registry";
import type { ProviderAgnosticPacket } from "@ai-hub/shared";

const packet: ProviderAgnosticPacket = {
  version: 1,
  system: "",
  messages: [{ role: "user", content: "hi" }],
  tokenEstimate: 1,
  excluded: [],
};

function sseBody(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

describe("resolveAdapter", () => {
  it("maps first-class slugs without treating OpenRouter as a custom URL", () => {
    expect(resolveAdapter("openai").id).toBe("openai");
    expect(resolveAdapter("openrouter").id).toBe("openrouter");
    expect(resolveAdapter("anthropic").id).toBe("anthropic");
    expect(resolveAdapter("google").id).toBe("google");
    expect(resolveAdapter("groq").id).toBe("groq");
    expect(resolveAdapter("ollama").id).toBe("ollama");
    expect(resolveAdapter("custom", { baseUrl: "http://127.0.0.1:8080/v1" }).id).toBe("custom");
  });

  it("rejects custom without a base URL and unknown slugs", () => {
    expect(() => resolveAdapter("custom")).toThrow(GatewayError);
    expect(() => resolveAdapter("chatgpt")).toThrow(GatewayError);
  });
});

describe("createOpenRouterAdapter", () => {
  it("sends OpenRouter identity headers on a fixture stream", async () => {
    const seen: string[] = [];
    const adapter = createOpenRouterAdapter({
      fetch: async (input, init) => {
        seen.push(String(input));
        const headers = new Headers(init?.headers);
        expect(headers.get("HTTP-Referer")).toBe("https://github.com/solerpedroo/ai_hub");
        expect(headers.get("X-Title")).toBe("AI Hub Desktop");
        expect(headers.get("Authorization")).toBe("Bearer sk-or-testfixtureABCDEFGH");
        return new Response(
          sseBody([
            `data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n`,
            `data: [DONE]\n\n`,
          ]),
          { status: 200, headers: { "Content-Type": "text/event-stream" } },
        );
      },
    });
    const texts: string[] = [];
    for await (const event of adapter.chatStream({
      secret: "sk-or-testfixtureABCDEFGH",
      model: "openai/gpt-4o-mini",
      packet,
      signal: new AbortController().signal,
    })) {
      if (event.type === "delta") {
        texts.push(event.text);
      }
    }
    expect(texts.join("")).toBe("Hi");
    expect(seen[0]).toContain("openrouter.ai/api/v1/chat/completions");
  });
});
