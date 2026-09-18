import type { GatewayErrorCode } from "@ai-hub/shared";
import { GatewayError, gatewayErrorCode } from "./errors";

export const TRANSIENT_GATEWAY_CODES: readonly GatewayErrorCode[] = ["timeout", "rate_limit", "network"];

export function isTransientGatewayCode(code: GatewayErrorCode): boolean {
  return TRANSIENT_GATEWAY_CODES.includes(code);
}

export function retryBackoffMs(attempt: number): number {
  return 400 * 3 ** attempt;
}

export async function withTransientRetry<T>(input: {
  maxAttempts: number;
  signal: AbortSignal;
  didStream: () => boolean;
  onRetry?: (attempt: number, code: GatewayErrorCode) => void | Promise<void>;
  delayMs?: (attempt: number) => number;
  run: () => Promise<T>;
}): Promise<T> {
  let lastError: unknown = new GatewayError("unknown", "gateway:unknown");
  for (let attempt = 0; attempt < input.maxAttempts; attempt += 1) {
    try {
      return await input.run();
    } catch (error) {
      lastError = error;
      const code: GatewayErrorCode = input.signal.aborted ? "aborted" : gatewayErrorCode(error);
      if (
        input.didStream() ||
        !isTransientGatewayCode(code) ||
        input.signal.aborted ||
        attempt === input.maxAttempts - 1
      ) {
        throw error;
      }
      await input.onRetry?.(attempt + 1, code);
      const wait = (input.delayMs ?? retryBackoffMs)(attempt);
      if (wait > 0) {
        await sleepAbortable(wait, input.signal);
      }
    }
  }
  throw lastError;
}

export async function sleepAbortable(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    throw new GatewayError("aborted", "gateway:aborted");
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new GatewayError("aborted", "gateway:aborted"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
