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

export interface GeminiAdapterOptions {
  fetch?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
}

interface GeminiStreamChunk {
  candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
  usageMetadata?: { promptTokenCount?: unknown; candidatesTokenCount?: unknown };
  error?: { message?: unknown; status?: unknown };
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
  const raw = (error ? readString(error.message) : null) ?? `Gemini HTTP ${status}`;
  const message = redactSecrets(raw);
  const code = error ? readString(error.status) : null;
  if (status === 401 || status === 403 || code === "UNAUTHENTICATED" || code === "PERMISSION_DENIED") {
    return new GatewayError("auth", message);
  }
  if (status === 429 || code === "RESOURCE_EXHAUSTED") {
    return new GatewayError("rate_limit", message);
  }
  if (code === "INVALID_ARGUMENT" && /context|token/i.test(message)) {
    return new GatewayError("context_overflow", message);
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

function packetToGemini(packet: ProviderAgnosticPacket): {
  systemInstruction: { parts: Array<{ text: string }> } | undefined;
  contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
} {
  return {
    systemInstruction: packet.system.length > 0 ? { parts: [{ text: packet.system }] } : undefined,
    contents: packet.messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
  };
}

export function createGeminiAdapter(options: GeminiAdapterOptions = {}): ProviderAdapter {
  const fetchFn = options.fetch ?? fetch;
  const baseUrl = (options.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta").replace(
    /\/$/,
    "",
  );
  const timeoutMs = options.timeoutMs ?? 60_000;

  const request = async (
    model: string,
    secret: string,
    body: Record<string, unknown>,
    signal: AbortSignal,
    stream: boolean,
  ): Promise<{ response: Response; timeout: AbortSignal }> => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const combined = AbortSignal.any([signal, timeout]);
    const path = stream
      ? `/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`
      : `/models/${encodeURIComponent(model)}:generateContent`;
    try {
      const response = await fetchFn(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "x-goog-api-key": secret,
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
    id: "google",
    listModels(): ModelRef[] {
      return catalogModelsForProvider("google").map((model) => ({ id: model.id, label: model.label }));
    },
    capabilities(): ProviderCapabilities {
      return { streaming: true, tools: false };
    },
    async testConnection(secret: string, signal: AbortSignal): Promise<void> {
      const { response } = await request(
        "gemini-2.0-flash",
        secret,
        {
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 1 },
        },
        signal,
        false,
      );
      if (!response.ok) {
        throw mapStatus(response.status, await readJson(response));
      }
    },
    async *chatStream(input: ChatStreamRequest): AsyncIterable<ChatStreamEvent> {
      const converted = packetToGemini(input.packet);
      const generationConfig: Record<string, unknown> = {
        temperature: input.temperature ?? 1,
      };
      if (input.maxTokens !== undefined && input.maxTokens !== null) {
        generationConfig.maxOutputTokens = input.maxTokens;
      }
      const body: Record<string, unknown> = {
        contents: converted.contents,
        generationConfig,
      };
      if (converted.systemInstruction !== undefined) {
        body.systemInstruction = converted.systemInstruction;
      }
      const { response, timeout } = await request(input.model, input.secret, body, input.signal, true);
      if (!response.ok) {
        throw mapStatus(response.status, await readJson(response));
      }
      if (!response.body) {
        throw new GatewayError("network", "Gemini response had no body");
      }
      for await (const data of iterateSseData(response.body, input.signal, timeout)) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(data) as unknown;
        } catch {
          continue;
        }
        const chunk = parsed as GeminiStreamChunk;
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text === "string" && text.length > 0) {
          yield { type: "delta", text };
        }
        const prompt = readNumber(chunk.usageMetadata?.promptTokenCount);
        const completion = readNumber(chunk.usageMetadata?.candidatesTokenCount);
        if (prompt !== null || completion !== null) {
          yield { type: "usage", tokensIn: prompt ?? 0, tokensOut: completion ?? 0 };
        }
      }
    },
  };
}
