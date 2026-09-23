import { redactSecrets } from "@ai-hub/security";
import type { ChatStreamEvent, ChatStreamRequest, ModelRef, ProviderAdapter } from "./adapter";
import { councilDispatchInstruction } from "./adapter";
import { GatewayError } from "./errors";

export const OLLAMA_BASE_URL = "http://127.0.0.1:11434";

interface OllamaOptions { fetch?: typeof fetch; baseUrl?: string; timeoutMs?: number }

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function transportError(error: unknown, signal: AbortSignal, timeout: AbortSignal): never {
  if (error instanceof GatewayError) throw error;
  if (signal.aborted) throw new GatewayError("aborted", "Local request aborted");
  if (timeout.aborted) throw new GatewayError("timeout", "Ollama request timed out");
  throw new GatewayError("network", redactSecrets(error instanceof Error ? error.message : "Ollama is unavailable"));
}

export function createOllamaAdapter(options: OllamaOptions = {}): ProviderAdapter & { discoverModels(signal: AbortSignal): Promise<ModelRef[]> } {
  const fetchFn = options.fetch ?? fetch;
  const baseUrl = options.baseUrl ?? OLLAMA_BASE_URL;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const request = async (path: string, signal: AbortSignal, body?: unknown): Promise<{ response: Response; timeout: AbortSignal }> => {
    const timeout = AbortSignal.timeout(timeoutMs);
    try {
      const response = await fetchFn(`${baseUrl}${path}`, {
        method: body === undefined ? "GET" : "POST",
        ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
        signal: AbortSignal.any([signal, timeout]),
      });
      if (!response.ok) {
        const code = response.status === 404 ? "unknown" : "network";
        throw new GatewayError(code, `Ollama HTTP ${response.status}`);
      }
      return { response, timeout };
    } catch (error) { return transportError(error, signal, timeout); }
  };
  return {
    id: "ollama",
    listModels(): ModelRef[] { return []; },
    capabilities() { return { streaming: true, tools: false, thinking: false }; },
    async discoverModels(signal: AbortSignal): Promise<ModelRef[]> {
      const { response } = await request("/api/tags", signal);
      const data = object(await response.json());
      if (!data || !Array.isArray(data.models)) throw new GatewayError("unknown", "Invalid Ollama models response");
      return data.models.flatMap((entry) => {
        const row = object(entry);
        const id = row?.name;
        return typeof id === "string" && id.length > 0 && id.length <= 128 ? [{ id, label: id }] : [];
      });
    },
    async testConnection(_secret: string, signal: AbortSignal): Promise<void> { await this.discoverModels(signal); },
    async *chatStream(input: ChatStreamRequest): AsyncIterable<ChatStreamEvent> {
      const messages: Array<{ role: string; content: string; images?: string[] }> = [];
      const instruction = councilDispatchInstruction(input.councilRole);
      if (instruction) messages.push({ role: "system", content: instruction });
      if (input.packet.system) messages.push({ role: "system", content: input.packet.system });
      messages.push(...input.packet.messages.map(({ role, content }) => ({ role, content })));
      if (input.images?.length) {
        const last = messages.at(-1);
        if (last?.role === "user") last.images = input.images.map((image) => image.data);
      }
      const body = { model: input.model, messages, stream: true, options: { num_ctx: 8_192, temperature: input.temperature ?? 1, ...(input.maxTokens ? { num_predict: input.maxTokens } : {}) } };
      const { response, timeout } = await request("/api/chat", input.signal, body);
      if (!response.body) throw new GatewayError("network", "Ollama response had no body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";
      let completed = false;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          let newline = pending.indexOf("\n");
          while (newline >= 0) {
            const line = pending.slice(0, newline).trim();
            pending = pending.slice(newline + 1);
            if (line) {
              let parsed: unknown;
              try { parsed = JSON.parse(line) as unknown; } catch { throw new GatewayError("network", "Invalid Ollama stream chunk"); }
              const row = object(parsed);
              const error = row?.error;
              if (typeof error === "string") throw new GatewayError("unknown", redactSecrets(error));
              const message = object(row?.message);
              if (typeof message?.content === "string" && message.content) yield { type: "delta", text: message.content };
              if (row?.done === true) {
                completed = true;
                yield { type: "usage", tokensIn: typeof row.prompt_eval_count === "number" ? row.prompt_eval_count : 0, tokensOut: typeof row.eval_count === "number" ? row.eval_count : 0, costUsd: "0.000000" };
              }
            }
            newline = pending.indexOf("\n");
          }
        }
        if (pending.trim()) throw new GatewayError("network", "Incomplete Ollama stream");
        if (!completed) throw new GatewayError("network", "Ollama stream ended before completion");
      } catch (error) { transportError(error, input.signal, timeout); }
      finally { reader.releaseLock(); }
    },
  };
}
