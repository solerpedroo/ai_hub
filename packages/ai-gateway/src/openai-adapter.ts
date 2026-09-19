import { redactSecrets } from "@ai-hub/security";
import { catalogModelsForProvider, type ProviderAgnosticPacket } from "@ai-hub/shared";
import type {
  ChatStreamEvent,
  ChatStreamRequest,
  ModelRef,
  ProviderAdapter,
  ProviderCapabilities,
} from "./adapter";
import { GatewayError } from "./errors";
import { iterateSseData } from "./sse";

export interface OpenAICompatibleAdapterOptions {
  id?: string;
  fetch?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
  extraHeaders?: Record<string, string>;
  testModel?: string;
}

interface OpenAIStreamChunk {
  choices?: Array<{ delta?: { content?: unknown } }>;
  usage?: { prompt_tokens?: unknown; completion_tokens?: unknown; cost?: unknown };
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

function packetMessages(
  packet: ProviderAgnosticPacket,
  images: ChatStreamRequest["images"],
): Array<{ role: string; content: unknown }> {
  const messages: Array<{ role: string; content: unknown }> = [];
  if (packet.system.length > 0) {
    messages.push({ role: "system", content: packet.system });
  }
  const lastUser = [...packet.messages].reverse().find((item) => item.role === "user");
  for (const message of packet.messages) {
    if (
      images &&
      images.length > 0 &&
      lastUser &&
      message === lastUser
    ) {
      messages.push({
        role: message.role,
        content: [
          { type: "text", text: message.content },
          ...images.map((image) => ({
            type: "image_url",
            image_url: { url: `data:${image.mime};base64,${image.data}` },
          })),
        ],
      });
      continue;
    }
    messages.push({ role: message.role, content: message.content });
  }
  return messages;
}

function mapStatus(status: number, body: unknown): GatewayError {
  const record = asObject(body);
  const error = record ? asObject(record.error) : null;
  const raw = (error ? readString(error.message) : null) ?? `OpenAI-compatible HTTP ${status}`;
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

export function createOpenAICompatibleAdapter(
  options: OpenAICompatibleAdapterOptions & { id: string; baseUrl: string; testModel: string },
): ProviderAdapter {
  const fetchFn = options.fetch ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const timeoutMs = options.timeoutMs ?? 60_000;
  const extraHeaders = options.extraHeaders ?? {};

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
          ...extraHeaders,
        },
        body: JSON.stringify(body),
        signal: combined,
      });
      return { response, timeout };
    } catch (error) {
      classifyTransport(error, signal, timeout);
    }
  };

  const requestGet = async (
    path: string,
    secret: string,
    signal: AbortSignal,
  ): Promise<{ response: Response; timeout: AbortSignal }> => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const combined = AbortSignal.any([signal, timeout]);
    try {
      const response = await fetchFn(`${baseUrl}${path}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secret}`,
          ...extraHeaders,
        },
        signal: combined,
      });
      return { response, timeout };
    } catch (error) {
      classifyTransport(error, signal, timeout);
    }
  };

  return {
    id: options.id,
    listModels(): ModelRef[] {
      return catalogModelsForProvider(options.id).map((model) => ({ id: model.id, label: model.label }));
    },
    capabilities(): ProviderCapabilities {
      return { streaming: true, tools: false };
    },
    async testConnection(secret: string, signal: AbortSignal): Promise<void> {
      if (options.id === "custom") {
        const { response } = await requestGet("/models", secret, signal);
        if (!response.ok) {
          throw mapStatus(response.status, await readJson(response));
        }
        return;
      }
      const { response } = await request(
        "/chat/completions",
        secret,
        {
          model: options.testModel,
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
      const body: Record<string, unknown> = {
        model: input.model,
        stream: true,
        stream_options: { include_usage: true },
        messages: packetMessages(input.packet, input.images),
        temperature: input.temperature ?? 1,
      };
      if (input.maxTokens !== undefined && input.maxTokens !== null) {
        body.max_tokens = input.maxTokens;
      }
      if (options.id === "openrouter") {
        body.usage = { include: true };
      }
      const { response, timeout } = await request("/chat/completions", input.secret, body, input.signal);
      if (!response.ok) {
        throw mapStatus(response.status, await readJson(response));
      }
      if (!response.body) {
        throw new GatewayError("network", "OpenAI-compatible response had no body");
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
        const cost = readNumber(chunk.usage?.cost);
        if (prompt !== null || completion !== null || cost !== null) {
          const usage: ChatStreamEvent = {
            type: "usage",
            tokensIn: prompt ?? 0,
            tokensOut: completion ?? 0,
          };
          if (cost !== null) {
            usage.costUsd = cost.toFixed(6);
          }
          yield usage;
        }
      }
    },
  };
}

export function mergeOpenAICompatibleOptions(
  defaults: { id: string; baseUrl: string; testModel: string; extraHeaders?: Record<string, string> },
  options: OpenAICompatibleAdapterOptions,
): OpenAICompatibleAdapterOptions & { id: string; baseUrl: string; testModel: string } {
  const extraHeaders = { ...defaults.extraHeaders, ...options.extraHeaders };
  const merged: OpenAICompatibleAdapterOptions & { id: string; baseUrl: string; testModel: string } = {
    id: options.id ?? defaults.id,
    baseUrl: options.baseUrl ?? defaults.baseUrl,
    testModel: options.testModel ?? defaults.testModel,
  };
  if (options.fetch !== undefined) {
    merged.fetch = options.fetch;
  }
  if (options.timeoutMs !== undefined) {
    merged.timeoutMs = options.timeoutMs;
  }
  if (Object.keys(extraHeaders).length > 0) {
    merged.extraHeaders = extraHeaders;
  }
  return merged;
}

export function createOpenAIAdapter(options: OpenAICompatibleAdapterOptions = {}): ProviderAdapter {
  return createOpenAICompatibleAdapter(
    mergeOpenAICompatibleOptions(
      { id: "openai", baseUrl: "https://api.openai.com/v1", testModel: "gpt-4o-mini" },
      options,
    ),
  );
}

export type OpenAIAdapterOptions = OpenAICompatibleAdapterOptions;
