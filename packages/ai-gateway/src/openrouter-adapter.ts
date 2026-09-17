import type { ProviderAdapter } from "./adapter";
import {
  createOpenAICompatibleAdapter,
  mergeOpenAICompatibleOptions,
  type OpenAICompatibleAdapterOptions,
} from "./openai-adapter";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export function createOpenRouterAdapter(options: OpenAICompatibleAdapterOptions = {}): ProviderAdapter {
  return createOpenAICompatibleAdapter(
    mergeOpenAICompatibleOptions(
      {
        id: "openrouter",
        baseUrl: OPENROUTER_BASE_URL,
        testModel: "openai/gpt-4o-mini",
        extraHeaders: {
          "HTTP-Referer": "https://github.com/solerpedroo/ai_hub",
          "X-Title": "AI Hub Desktop",
        },
      },
      options,
    ),
  );
}
