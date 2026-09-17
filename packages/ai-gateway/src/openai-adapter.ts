import { redactSecrets } from "@ai-hub/security";
import { openaiCatalogModels, type ProviderAgnosticPacket } from "@ai-hub/shared";
import type {
  ChatStreamEvent,
  ChatStreamRequest,
  ModelRef,
  ProviderAdapter,
  ProviderCapabilities,
} from "./adapter";
import { GatewayError } from "./errors";
import { iterateSseData } from "./sse";

export interface OpenAIAdapterOptions {
  fetch?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
}

interface OpenAIStreamChunk {
  choices?: Array<{ delta?: { content?: unknown } }>;
  usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
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

function packetMessages(packet: ProviderAgnosticPacket): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [];
  if (packet.system.length > 0) {
    messages.push({ role: "system", content: packet.system });
  }
  for (const message of packet.messages) {
    messages.push({ role: message.role, content: message.content });
  }
  return messages;
}

function mapStatus(status: number, body: unknown): GatewayError {
  const record = asObject(body);
  const error = record ? asObject(record.error) : null;
  const raw = (error ? readString(error.message) : null) ?? `OpenAI HTTP ${status}`;
  const message = redactSecrets(raw);
  const code = error ? readString(error.code) ?? readString(error.type) : null;
  if (status === 401 || status === 403 || code === "invalid_api_key") {
    return new GatewayError("auth", message);
  }
  if (status === 402 || code === "insufficient_quota") {
    return new GatewayError("quota", message);
  }
  if (code === "context_length_exceeded" || /context length|maximum context/i.test(message)) {
    return new GatewayError("context_overflow", message);
  }
  if (status === 429) {
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

export function createOpenAIAdapter(options: OpenAIAdapterOptions = {}): ProviderAdapter {
  const fetchFn = options.fetch ?? fetch;
  const baseUrl = (options.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const timeoutMs = options.timeoutMs ?? 60_000;

  const request = async (
    path: string,
    secret: string,
    body: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<{ response: Response; timeout: AbortSignal }> => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const combined = AbortSignal.any([signal, timeout]);
    try {
      const response = await fetchFn(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
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
    id: "openai",
    listModels(): ModelRef[] {
      return openaiCatalogModels().map((model) => ({ id: model.id, label: model.label }));
    },
    capabilities(): ProviderCapabilities {
      return { streaming: true, tools: false };
    },
    async testConnection(secret: string, signal: AbortSignal): Promise<void> {
      const { response } = await request(
        "/chat/completions",
        secret,
        {
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        },
        signal,
      );
      if (!response.ok) {
        throw mapStatus(response.status, await readJson(response));
      }
    },
    async *chatStream(input: ChatStreamRequest): AsyncIterable<ChatStreamEvent> {
      const { response, timeout } = await request(
        "/chat/completions",
        input.secret,
        {
          model: input.model,
          stream: true,
          stream_options: { include_usage: true },
          messages: packetMessages(input.packet),
        },
        input.signal,
      );
      if (!response.ok) {
        throw mapStatus(response.status, await readJson(response));
      }
      if (!response.body) {
        throw new GatewayError("network", "OpenAI response had no body");
      }
      for await (const data of iterateSseData(response.body, input.signal, timeout)) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(data) as unknown;
        } catch {
          continue;
        }
        const chunk = parsed as OpenAIStreamChunk;
        const delta = chunk.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) {
          yield { type: "delta", text: delta };
        }
        const prompt = readNumber(chunk.usage?.prompt_tokens);
        const completion = readNumber(chunk.usage?.completion_tokens);
        if (prompt !== null || completion !== null) {
          yield { type: "usage", tokensIn: prompt ?? 0, tokensOut: completion ?? 0 };
        }
      }
    },
  };
}
