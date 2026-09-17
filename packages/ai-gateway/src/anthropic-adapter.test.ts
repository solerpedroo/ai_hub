import { describe, expect, it } from "vitest";
import { createAnthropicAdapter } from "./anthropic-adapter";
import { GatewayError } from "./errors";
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

describe("createAnthropicAdapter", () => {
  it("streams text deltas from an SSE fixture", async () => {
    const adapter = createAnthropicAdapter({
      fetch: async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as { system?: string; max_tokens?: number };
        expect(body.system).toBe("Be brief.");
        expect(body.max_tokens).toBe(64);
        return new Response(
          sseBody([
            `event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hel"}}\n\n`,
            `event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"lo"}}\n\n`,
            `event: message_delta\ndata: {"type":"message_delta","usage":{"output_tokens":2}}\n\n`,
          ]),
          { status: 200, headers: { "Content-Type": "text/event-stream" } },
        );
      },
    });
    const texts: string[] = [];
    let usage: { tokensIn: number; tokensOut: number } | null = null;
    for await (const event of adapter.chatStream({
      secret: "sk-ant-testfixtureABCDEFGH",
      model: "claude-3-5-haiku-20241022",
      packet,
      signal: new AbortController().signal,
      maxTokens: 64,
    })) {
      if (event.type === "delta") {
        texts.push(event.text);
      } else {
        usage = { tokensIn: event.tokensIn, tokensOut: event.tokensOut };
      }
    }
    expect(texts.join("")).toBe("Hello");
    expect(usage?.tokensOut).toBe(2);
  });

  it("maps 401 to auth without echoing the secret", async () => {
    const secret = "sk-ant-testfixtureABCDEFGH";
    const adapter = createAnthropicAdapter({
      fetch: async () =>
        new Response(JSON.stringify({ error: { type: "authentication_error", message: secret } }), {
          status: 401,
        }),
    });
    try {
      await adapter
        .chatStream({
          secret,
          model: "claude-3-5-haiku-20241022",
          packet,
          signal: new AbortController().signal,
        })
        .next();
      throw new Error("expected failure");
    } catch (error) {
      expect((error as GatewayError).code).toBe("auth");
      expect(String(error)).not.toContain(secret);
    }
  });
});
