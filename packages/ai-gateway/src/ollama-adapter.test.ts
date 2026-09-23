import { describe, expect, it } from "vitest";
import type { ProviderAgnosticPacket } from "@ai-hub/shared";
import { createOllamaAdapter } from "./ollama-adapter";

const packet: ProviderAgnosticPacket = { version: 1, system: "Be concise", messages: [{ role: "user", content: "hello" }], tokenEstimate: 4, excluded: [] };

describe("Ollama adapter", () => {
  it("discovers installed models and streams native NDJSON usage without an API key", async () => {
    const calls: Array<{ url: string; authorization: string | null; body: unknown }> = [];
    const adapter = createOllamaAdapter({ fetch: async (input, init) => {
      calls.push({ url: String(input), authorization: new Headers(init?.headers).get("Authorization"), body: init?.body ? JSON.parse(String(init.body)) as unknown : null });
      if (String(input).endsWith("/api/tags")) return Response.json({ models: [{ name: "llama3.2:latest" }] });
      return new Response(new ReadableStream({ start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('{"message":{"content":"Hello"},"done":false}\n'));
        controller.enqueue(encoder.encode('{"message":{"content":" local"},"done":false}\n{"done":true,"prompt_eval_count":8,"eval_count":2}\n'));
        controller.close();
      } }), { status: 200 });
    } });
    expect(await adapter.discoverModels(new AbortController().signal)).toEqual([{ id: "llama3.2:latest", label: "llama3.2:latest" }]);
    const events = [];
    for await (const event of adapter.chatStream({ secret: "", model: "llama3.2:latest", packet, signal: new AbortController().signal })) events.push(event);
    expect(events).toEqual([{ type: "delta", text: "Hello" }, { type: "delta", text: " local" }, { type: "usage", tokensIn: 8, tokensOut: 2, costUsd: "0.000000" }]);
    expect(calls.map((call) => call.url)).toEqual(["http://127.0.0.1:11434/api/tags", "http://127.0.0.1:11434/api/chat"]);
    expect(calls.every((call) => call.authorization === null)).toBe(true);
    expect(calls[1]?.body).toMatchObject({ model: "llama3.2:latest", stream: true, options: { num_ctx: 8_192 }, messages: [{ role: "system", content: "Be concise" }, { role: "user", content: "hello" }] });
  });

  it("classifies a cancelled stream as aborted", async () => {
    const controller = new AbortController();
    const adapter = createOllamaAdapter({ fetch: async (_input, _init) => {
      return new Response(new ReadableStream({ start(stream) {
        controller.abort();
        stream.error(new DOMException("Aborted", "AbortError"));
      } }), { status: 200 });
    } });
    await expect(async () => { for await (const _event of adapter.chatStream({ secret: "", model: "llama3.2", packet, signal: controller.signal })) { /* consume */ } }).rejects.toMatchObject({ code: "aborted" });
  });

  it("rejects a stream without a terminal done chunk", async () => {
    const adapter = createOllamaAdapter({ fetch: async () => new Response('{"message":{"content":"partial"},"done":false}\n', { status: 200 }) });
    const events = [];
    await expect(async () => {
      for await (const event of adapter.chatStream({ secret: "", model: "llama3.2", packet, signal: new AbortController().signal })) events.push(event);
    }).rejects.toMatchObject({ code: "network" });
    expect(events).toEqual([{ type: "delta", text: "partial" }]);
  });
});
