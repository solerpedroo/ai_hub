import type { ProviderAdapter } from "./adapter";
import {
  createOpenAICompatibleAdapter,
  mergeOpenAICompatibleOptions,
  type OpenAICompatibleAdapterOptions,
} from "./openai-adapter";

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export function createGroqAdapter(options: OpenAICompatibleAdapterOptions = {}): ProviderAdapter {
  return createOpenAICompatibleAdapter(
    mergeOpenAICompatibleOptions(
      { id: "groq", baseUrl: GROQ_BASE_URL, testModel: "llama-3.1-8b-instant" },
      options,
    ),
  );
}
