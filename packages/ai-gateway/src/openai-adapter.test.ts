import { describe, expect, it } from "vitest";
import { createOpenAIAdapter } from "./openai-adapter";
import { GatewayError } from "./errors";
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

describe("createOpenAIAdapter", () => {
  it("lists catalog models and streaming capability", () => {
    const adapter = createOpenAIAdapter({
      fetch: async () => {
        throw new Error("network should not be called");
      },
    });
    expect(adapter.id).toBe("openai");
    expect(adapter.capabilities()).toEqual({ streaming: true, tools: false });
    expect(adapter.listModels().some((model) => model.id === "gpt-4o-mini")).toBe(true);
  });

  it("streams deltas from an SSE fixture and records usage", async () => {
    const adapter = createOpenAIAdapter({
      fetch: async () =>
        new Response(
          sseBody([
            `data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n`,
            `data: {"choices":[{"delta":{"content":"lo"}}]}\n\n`,
            `data: {"choices":[],"usage":{"prompt_tokens":11,"completion_tokens":2}}\n\n`,
            `data: [DONE]\n\n`,
          ]),
          { status: 200, headers: { "Content-Type": "text/event-stream" } },
        ),
    });
    const texts: string[] = [];
    let usage: { tokensIn: number; tokensOut: number } | null = null;
    for await (const event of adapter.chatStream({
      secret: "sk-testfixtureABCDEFGH",
      model: "gpt-4o-mini",
      packet,
      signal: new AbortController().signal,
    })) {
      if (event.type === "delta") {
        texts.push(event.text);
      } else {
        usage = { tokensIn: event.tokensIn, tokensOut: event.tokensOut };
      }
    }
    expect(texts.join("")).toBe("Hello");
    expect(usage).toEqual({ tokensIn: 11, tokensOut: 2 });
  });

  it("maps 401 to auth and never throws the secret", async () => {
    const secret = "sk-testfixtureABCDEFGH";
    const adapter = createOpenAIAdapter({
      fetch: async () =>
        new Response(JSON.stringify({ error: { message: "Incorrect API key", code: "invalid_api_key" } }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
    });
    try {
      await adapter.chatStream({
        secret,
        model: "gpt-4o-mini",
        packet,
        signal: new AbortController().signal,
      }).next();
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(GatewayError);
      expect((error as GatewayError).code).toBe("auth");
      expect(String(error)).not.toContain(secret);
    }
  });

  it("maps insufficient_quota", async () => {
    const adapter = createOpenAIAdapter({
      fetch: async () =>
        new Response(JSON.stringify({ error: { code: "insufficient_quota", message: "quota" } }), {
          status: 429,
        }),
    });
    try {
      await adapter.chatStream({
        secret: "sk-testfixtureABCDEFGH",
        model: "gpt-4o-mini",
        packet,
        signal: new AbortController().signal,
      }).next();
      throw new Error("expected failure");
    } catch (error) {
      expect((error as GatewayError).code).toBe("quota");
    }
  });

  it("maps a fetch failure to network", async () => {
    const adapter = createOpenAIAdapter({
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    });
    try {
      await adapter.chatStream({
        secret: "sk-testfixtureABCDEFGH",
        model: "gpt-4o-mini",
        packet,
        signal: new AbortController().signal,
      }).next();
      throw new Error("expected failure");
    } catch (error) {
      expect((error as GatewayError).code).toBe("network");
    }
  });

  it("testConnection resolves on HTTP 200", async () => {
    const adapter = createOpenAIAdapter({
      fetch: async () => new Response("{}", { status: 200 }),
    });
    await expect(
      adapter.testConnection("sk-testfixtureABCDEFGH", new AbortController().signal),
    ).resolves.toBeUndefined();
  });

  it("redacts a secret echoed in a 401 body", async () => {
    const secret = "sk-testfixtureABCDEFGH";
    const adapter = createOpenAIAdapter({
      fetch: async () =>
        new Response(
          JSON.stringify({
            error: { message: `Incorrect API key provided: ${secret}`, code: "invalid_api_key" },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
    });
    try {
      await adapter
        .chatStream({
          secret,
          model: "gpt-4o-mini",
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

  it("maps a plain 429 to rate_limit", async () => {
    const adapter = createOpenAIAdapter({
      fetch: async () =>
        new Response(JSON.stringify({ error: { message: "slow down" } }), { status: 429 }),
    });
    try {
      await adapter
        .chatStream({
          secret: "sk-testfixtureABCDEFGH",
          model: "gpt-4o-mini",
          packet,
          signal: new AbortController().signal,
        })
        .next();
      throw new Error("expected failure");
    } catch (error) {
      expect((error as GatewayError).code).toBe("rate_limit");
    }
  });

  it("maps context_length_exceeded", async () => {
    const adapter = createOpenAIAdapter({
      fetch: async () =>
        new Response(JSON.stringify({ error: { code: "context_length_exceeded", message: "too long" } }), {
          status: 400,
        }),
    });
    try {
      await adapter
        .chatStream({
          secret: "sk-testfixtureABCDEFGH",
          model: "gpt-4o-mini",
          packet,
          signal: new AbortController().signal,
        })
        .next();
      throw new Error("expected failure");
    } catch (error) {
      expect((error as GatewayError).code).toBe("context_overflow");
    }
  });

  it("maps abort during the SSE body to aborted", async () => {
    const controller = new AbortController();
    const encoder = new TextEncoder();
    const adapter = createOpenAIAdapter({
      fetch: async () =>
        new Response(
          new ReadableStream({
            start(stream) {
              stream.enqueue(encoder.encode(`data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n`));
            },
          }),
          { status: 200, headers: { "Content-Type": "text/event-stream" } },
        ),
    });
    const iter = adapter.chatStream({
      secret: "sk-testfixtureABCDEFGH",
      model: "gpt-4o-mini",
      packet,
      signal: controller.signal,
    });
    await expect(iter.next()).resolves.toMatchObject({ value: { type: "delta", text: "Hi" } });
    controller.abort();
    await expect(iter.next()).rejects.toMatchObject({ code: "aborted" });
  });

  it("maps user abort before fetch to aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const adapter = createOpenAIAdapter({
      fetch: async (_url, init) => {
        const signal = init?.signal;
        if (signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        throw new Error("should have aborted");
      },
    });
    try {
      await adapter
        .chatStream({
          secret: "sk-testfixtureABCDEFGH",
          model: "gpt-4o-mini",
          packet,
          signal: controller.signal,
        })
        .next();
      throw new Error("expected failure");
    } catch (error) {
      expect((error as GatewayError).code).toBe("aborted");
    }
  });
});
