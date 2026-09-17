import { describe, expect, it } from "vitest";
import { consumeCrashSafeStream, STREAM_FLUSH_CHARS } from "./crash-safe";
import type { ChatStreamEvent } from "./adapter";
import { GatewayError } from "./errors";

async function* eventsOf(items: ChatStreamEvent[]): AsyncIterable<ChatStreamEvent> {
  for (const item of items) {
    yield item;
  }
}

describe("consumeCrashSafeStream", () => {
  it("flushes when pending characters reach the batch size", async () => {
    const flushes: string[] = [];
    const deltas: string[] = [];
    const chunk = "x".repeat(STREAM_FLUSH_CHARS);
    const result = await consumeCrashSafeStream({
      stream: eventsOf([
        { type: "delta", text: chunk },
        { type: "usage", tokensIn: 9, tokensOut: 3 },
      ]),
      onDelta: (text) => {
        deltas.push(text);
      },
      onFlush: (content) => {
        flushes.push(content);
      },
      now: () => 0,
    });
    expect(deltas).toEqual([chunk]);
    expect(flushes[0]).toBe(chunk);
    expect(result).toEqual({ content: chunk, tokensIn: 9, tokensOut: 3 });
  });

  it("flushes the partial before rethrowing an abort", async () => {
    const flushes: string[] = [];
    async function* failing(): AsyncIterable<ChatStreamEvent> {
      yield { type: "delta", text: "Hel" };
      throw new GatewayError("aborted", "Request aborted");
    }
    await expect(
      consumeCrashSafeStream({
        stream: failing(),
        onDelta: () => undefined,
        onFlush: (content) => {
          flushes.push(content);
        },
        now: () => 0,
      }),
    ).rejects.toMatchObject({ code: "aborted", content: "Hel", tokensIn: null, tokensOut: null });
    expect(flushes).toEqual(["Hel"]);
  });
});
