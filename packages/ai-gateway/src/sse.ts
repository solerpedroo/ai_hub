import { GatewayError } from "./errors";

export function classifyStreamAbort(userSignal: AbortSignal, timeout: AbortSignal): GatewayError {
  if (userSignal.aborted) {
    return new GatewayError("aborted", "Request aborted");
  }
  if (timeout.aborted) {
    return new GatewayError("timeout", "Request timed out");
  }
  return new GatewayError("network", "Stream interrupted");
}

export async function* iterateSseData(
  body: ReadableStream<Uint8Array>,
  userSignal: AbortSignal,
  timeout: AbortSignal,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const onAbort = (): void => {
    void reader.cancel().catch(() => undefined);
  };
  userSignal.addEventListener("abort", onAbort);
  timeout.addEventListener("abort", onAbort);
  try {
    while (true) {
      if (userSignal.aborted || timeout.aborted) {
        throw classifyStreamAbort(userSignal, timeout);
      }
      let read: Awaited<ReturnType<ReadableStreamDefaultReader<Uint8Array>["read"]>>;
      try {
        read = await reader.read();
      } catch (error) {
        if (error instanceof GatewayError) {
          throw error;
        }
        throw classifyStreamAbort(userSignal, timeout);
      }
      if (read.done) {
        break;
      }
      buffer += decoder.decode(read.value, { stream: true }).replace(/\r\n/g, "\n");
      let separator = buffer.indexOf("\n\n");
      while (separator >= 0) {
        const rawEvent = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        const data = rawEvent
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (data === "[DONE]") {
          return;
        }
        if (data.length > 0) {
          yield data;
        }
        separator = buffer.indexOf("\n\n");
      }
    }
  } finally {
    userSignal.removeEventListener("abort", onAbort);
    timeout.removeEventListener("abort", onAbort);
    try {
      reader.releaseLock();
    } catch {
      /* reader already cancelled */
    }
  }
}
