import { describe, expect, it } from "vitest";
import { iterateSseData } from "./sse";

function hangingAfter(first: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(first));
    },
  });
}

describe("iterateSseData", () => {
  it("maps user abort while waiting for the next chunk to aborted", async () => {
    const user = new AbortController();
    const timeout = new AbortController();
    const iter = iterateSseData(
      hangingAfter(`data: {"ok":true}\n\n`),
      user.signal,
      timeout.signal,
    );
    await expect(iter.next()).resolves.toMatchObject({ value: '{"ok":true}' });
    user.abort();
    await expect(iter.next()).rejects.toMatchObject({ code: "aborted" });
  });

  it("maps timeout while waiting for the next chunk", async () => {
    const user = new AbortController();
    const timeout = new AbortController();
    const iter = iterateSseData(
      hangingAfter(`data: {"ok":true}\n\n`),
      user.signal,
      timeout.signal,
    );
    await expect(iter.next()).resolves.toMatchObject({ value: '{"ok":true}' });
    timeout.abort();
    await expect(iter.next()).rejects.toMatchObject({ code: "timeout" });
  });
});
