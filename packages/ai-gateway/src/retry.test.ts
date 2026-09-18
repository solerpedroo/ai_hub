import { describe, expect, it } from "vitest";
import { GatewayError } from "./errors";
import { isTransientGatewayCode, retryBackoffMs, sleepAbortable, withTransientRetry } from "./retry";

describe("transient retry helpers", () => {
  it("classifies only timeout, rate_limit, and network as transient", () => {
    expect(isTransientGatewayCode("timeout")).toBe(true);
    expect(isTransientGatewayCode("rate_limit")).toBe(true);
    expect(isTransientGatewayCode("network")).toBe(true);
    expect(isTransientGatewayCode("auth")).toBe(false);
    expect(isTransientGatewayCode("quota")).toBe(false);
    expect(isTransientGatewayCode("context_overflow")).toBe(false);
    expect(isTransientGatewayCode("aborted")).toBe(false);
  });

  it("uses exponential backoff", () => {
    expect(retryBackoffMs(0)).toBe(400);
    expect(retryBackoffMs(1)).toBe(1200);
    expect(retryBackoffMs(2)).toBe(3600);
  });

  it("aborts sleep when the signal fires", async () => {
    const abort = new AbortController();
    const pending = sleepAbortable(5_000, abort.signal);
    abort.abort();
    await expect(pending).rejects.toBeInstanceOf(GatewayError);
  });

  it("retries transient failures only before the first byte", async () => {
    const abort = new AbortController();
    let attempts = 0;
    let streamed = false;
    const value = await withTransientRetry({
      maxAttempts: 3,
      signal: abort.signal,
      didStream: () => streamed,
      delayMs: () => 0,
      run: async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new GatewayError("timeout", "gateway:timeout");
        }
        return "ok";
      },
    });
    expect(value).toBe("ok");
    expect(attempts).toBe(3);

    streamed = true;
    attempts = 0;
    await expect(
      withTransientRetry({
        maxAttempts: 3,
        signal: abort.signal,
        didStream: () => streamed,
        run: async () => {
          attempts += 1;
          throw new GatewayError("timeout", "gateway:timeout");
        },
      }),
    ).rejects.toMatchObject({ code: "timeout" });
    expect(attempts).toBe(1);

    streamed = false;
    attempts = 0;
    await expect(
      withTransientRetry({
        maxAttempts: 3,
        signal: abort.signal,
        didStream: () => streamed,
        delayMs: () => 0,
        run: async () => {
          attempts += 1;
          throw new GatewayError("auth", "gateway:auth");
        },
      }),
    ).rejects.toMatchObject({ code: "auth" });
    expect(attempts).toBe(1);
  });
});
