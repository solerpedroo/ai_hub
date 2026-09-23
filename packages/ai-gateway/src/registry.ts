import type { ProviderAdapter } from "./adapter";
import { createAnthropicAdapter } from "./anthropic-adapter";
import { GatewayError } from "./errors";
import { createGeminiAdapter } from "./gemini-adapter";
import { createGroqAdapter } from "./groq-adapter";
import { createOpenAIAdapter, createOpenAICompatibleAdapter, mergeOpenAICompatibleOptions } from "./openai-adapter";
import { createOpenRouterAdapter } from "./openrouter-adapter";
import { createOllamaAdapter } from "./ollama-adapter";

export interface ResolveAdapterOptions {
  fetch?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
}

const KNOWN_SLUGS = ["openai", "openrouter", "anthropic", "google", "groq", "custom", "ollama"] as const;

export type ProviderSlug = (typeof KNOWN_SLUGS)[number];

export function isKnownProviderSlug(slug: string): slug is ProviderSlug {
  return (KNOWN_SLUGS as readonly string[]).includes(slug);
}

export function resolveAdapter(slug: string, options: ResolveAdapterOptions = {}): ProviderAdapter {
  switch (slug) {
    case "openai":
      return createOpenAIAdapter(options);
    case "openrouter":
      return createOpenRouterAdapter(options);
    case "anthropic":
      return createAnthropicAdapter(options);
    case "google":
      return createGeminiAdapter(options);
    case "groq":
      return createGroqAdapter(options);
    case "ollama":
      return createOllamaAdapter(options);
    case "custom": {
      if (options.baseUrl === undefined || options.baseUrl.trim().length === 0) {
        throw new GatewayError("unknown", "Custom provider requires a base URL");
      }
      return createOpenAICompatibleAdapter(
        mergeOpenAICompatibleOptions(
          { id: "custom", baseUrl: options.baseUrl, testModel: "gpt-4o-mini" },
          options,
        ),
      );
    }
    default:
      throw new GatewayError("unknown", `Unknown provider: ${slug}`);
  }
}
