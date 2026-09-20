import { redactSecrets } from "@ai-hub/security";
import { catalogModelsForProvider, type ProviderAgnosticPacket } from "@ai-hub/shared";
import {
  packetForDispatch,
  type ChatStreamEvent,
  type ChatStreamRequest,
  type ModelRef,
  type ProviderAdapter,
  type ProviderCapabilities,
} from "./adapter";
import { GatewayError } from "./errors";
import { iterateSseData } from "./sse";

export interface AnthropicAdapterOptions {
  fetch?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
}

interface AnthropicStreamEvent {
  type?: unknown;
  delta?: { type?: unknown; text?: unknown };
  usage?: { input_tokens?: unknown; output_tokens?: unknown };
  message?: { usage?: { input_tokens?: unknown; output_tokens?: unknown } };
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapStatus(status: number, body: unknown): GatewayError {
  const record = asObject(body);
  const error = record ? asObject(record.error) : null;
  const raw = (error ? readString(error.message) : null) ?? `Anthropic HTTP ${status}`;
  const message = redactSecrets(raw);
  const type = error ? readString(error.type) : null;
  if (status === 401 || status === 403 || type === "authentication_error") {
    return new GatewayError("auth", message);
  }
  if (status === 402 || type === "billing_error") {
    return new GatewayError("quota", message);
  }
  if (type === "invalid_request_error" && /context|too long|max_tokens/i.test(message)) {
    return new GatewayError("context_overflow", message);
  }
  if (status === 429 || type === "rate_limit_error") {
    return new GatewayError("rate_limit", message);
  }
  if (status >= 500) {
    return new GatewayError("network", message);
  }
  return new GatewayError("unknown", message);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function classifyTransport(error: unknown, userSignal: AbortSignal, timeout: AbortSignal): never {
  if (error instanceof GatewayError) {
    throw error;
  }
  if (userSignal.aborted) {
    throw new GatewayError("aborted", "Request aborted");
  }
  if (timeout.aborted) {
    throw new GatewayError("timeout", "Request timed out");
  }
  const message = redactSecrets(error instanceof Error ? error.message : "Network error");
  throw new GatewayError("network", message);
}

function packetToAnthropic(
  packet: ProviderAgnosticPacket,
  images?: ChatStreamRequest["images"],
): {
  system: string | undefined;
  messages: Array<{ role: "user" | "assistant"; content: unknown }>;
} {
  const lastUser = [...packet.messages].reverse().find((item) => item.role === "user");
  return {
    system: packet.system.length > 0 ? packet.system : undefined,
    messages: packet.messages.map((message) => {
      if (images && images.length > 0 && lastUser && message === lastUser) {
        return {
          role: message.role,
          content: [
            { type: "text", text: message.content },
            ...images.map((image) => ({
              type: "image",
              source: { type: "base64", media_type: image.mime, data: image.data },
            })),
          ],
        };
      }
      return { role: message.role, content: message.content };
    }),
  };
}

export function createAnthropicAdapter(options: AnthropicAdapterOptions = {}): ProviderAdapter {
  const fetchFn = options.fetch ?? fetch;
  const baseUrl = (options.baseUrl ?? "https://api.anthropic.com/v1").replace(/\/$/, "");
  const timeoutMs = options.timeoutMs ?? 60_000;

  const request = async (
    secret: string,
    body: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<{ response: Response; timeout: AbortSignal }> => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const combined = AbortSignal.any([signal, timeout]);
    try {
      const response = await fetchFn(`${baseUrl}/messages`, {
        method: "POST",
        headers: {
          "x-api-key": secret,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: combined,
      });
      return { response, timeout };
    } catch (error) {
      classifyTransport(error, signal, timeout);
    }
  };

  return {
    id: "anthropic",
    listModels(): ModelRef[] {
      return catalogModelsForProvider("anthropic").map((model) => ({ id: model.id, label: model.label }));
    },
    capabilities(): ProviderCapabilities {
      return { streaming: true, tools: false };
    },
    async testConnection(secret: string, signal: AbortSignal): Promise<void> {
      const { response } = await request(
        secret,
        {
          model: "claude-3-5-haiku-20241022",
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        },
        signal,
      );
      if (!response.ok) {
        throw mapStatus(response.status, await readJson(response));
      }
    },
    async *chatStream(input: ChatStreamRequest): AsyncIterable<ChatStreamEvent> {
      const converted = packetToAnthropic(packetForDispatch(input), input.images);
      const body: Record<string, unknown> = {
        model: input.model,
        stream: true,
        max_tokens: input.maxTokens ?? 1024,
        temperature: input.temperature ?? 1,
        messages: converted.messages,
      };
      if (converted.system !== undefined) {
        body.system = converted.system;
      }
      const { response, timeout } = await request(input.secret, body, input.signal);
      if (!response.ok) {
        throw mapStatus(response.status, await readJson(response));
      }
      if (!response.body) {
        throw new GatewayError("network", "Anthropic response had no body");
      }
      let tokensIn = 0;
      let tokensOut = 0;
      for await (const data of iterateSseData(response.body, input.signal, timeout)) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(data) as unknown;
        } catch {
          continue;
        }
        const event = parsed as AnthropicStreamEvent;
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          const text = event.delta.text;
          if (typeof text === "string" && text.length > 0) {
            yield { type: "delta", text };
          }
        }
        const inputTokens =
          readNumber(event.message?.usage?.input_tokens) ?? readNumber(event.usage?.input_tokens);
        const outputTokens = readNumber(event.usage?.output_tokens);
        if (inputTokens !== null) {
          tokensIn = inputTokens;
        }
        if (outputTokens !== null) {
          tokensOut = outputTokens;
        }
        if (event.type === "message_delta" && (tokensIn > 0 || tokensOut > 0)) {
          yield { type: "usage", tokensIn, tokensOut };
        }
      }
    },
  };
}
