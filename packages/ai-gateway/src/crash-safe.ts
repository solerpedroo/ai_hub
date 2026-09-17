import type { ChatStreamEvent } from "./adapter";
import { GatewayStreamError } from "./errors";

export const STREAM_FLUSH_CHARS = 48;
export const STREAM_FLUSH_MS = 200;

export interface CrashSafeStreamResult {
  content: string;
  tokensIn: number | null;
  tokensOut: number | null;
}

export async function consumeCrashSafeStream(input: {
  stream: AsyncIterable<ChatStreamEvent>;
  onDelta: (text: string) => void;
  onFlush: (content: string) => void;
  now?: () => number;
}): Promise<CrashSafeStreamResult> {
  const now = input.now ?? Date.now;
  let content = "";
  let lastFlushed = "";
  let lastFlushAt = now();
  let tokensIn: number | null = null;
  let tokensOut: number | null = null;

  const flush = (force: boolean): void => {
    if (content === lastFlushed) {
      return;
    }
    const pending = content.length - lastFlushed.length;
    const elapsed = now() - lastFlushAt;
    if (!force && pending < STREAM_FLUSH_CHARS && elapsed < STREAM_FLUSH_MS) {
      return;
    }
    input.onFlush(content);
    lastFlushed = content;
    lastFlushAt = now();
  };

  const timer = setInterval(() => {
    flush(false);
  }, STREAM_FLUSH_MS);

  try {
    for await (const event of input.stream) {
      if (event.type === "delta") {
        content += event.text;
        input.onDelta(event.text);
        flush(false);
      } else {
        tokensIn = event.tokensIn;
        tokensOut = event.tokensOut;
      }
    }
    flush(true);
    return { content, tokensIn, tokensOut };
  } catch (error) {
    flush(true);
    throw new GatewayStreamError(error, { content, tokensIn, tokensOut });
  } finally {
    clearInterval(timer);
  }
}
