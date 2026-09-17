import { describe, expect, it } from "vitest";
import { createGeminiAdapter } from "./gemini-adapter";
import type { ProviderAgnosticPacket } from "@ai-hub/shared";

const packet: ProviderAgnosticPacket = {
  version: 1,
  system: "Be brief.",
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

describe("createGeminiAdapter", () => {
  it("streams text from an SSE fixture and keeps the key out of the URL", async () => {
    const adapter = createGeminiAdapter({
      fetch: async (input, init) => {
        expect(String(input)).not.toContain("sk-");
        expect(new Headers(init?.headers).get("x-goog-api-key")).toBe("test-gemini-fixture-key");
        const body = JSON.parse(String(init?.body)) as {
          systemInstruction?: { parts: Array<{ text: string }> };
        };
        expect(body.systemInstruction?.parts[0]?.text).toBe("Be brief.");
        return new Response(
          sseBody([
            `data: {"candidates":[{"content":{"parts":[{"text":"Hi"}]}}],"usageMetadata":{"promptTokenCount":3,"candidatesTokenCount":1}}\n\n`,
          ]),
          { status: 200, headers: { "Content-Type": "text/event-stream" } },
        );
      },
    });
    const texts: string[] = [];
    let usage: { tokensIn: number; tokensOut: number } | null = null;
    for await (const event of adapter.chatStream({
      secret: "test-gemini-fixture-key",
      model: "gemini-2.0-flash",
      packet,
      signal: new AbortController().signal,
    })) {
      if (event.type === "delta") {
        texts.push(event.text);
      } else {
        usage = { tokensIn: event.tokensIn, tokensOut: event.tokensOut };
      }
    }
    expect(texts.join("")).toBe("Hi");
    expect(usage).toEqual({ tokensIn: 3, tokensOut: 1 });
  });
});
