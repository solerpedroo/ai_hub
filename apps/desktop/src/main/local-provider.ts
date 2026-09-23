import { createOllamaAdapter } from "@ai-hub/ai-gateway";
import { OLLAMA_LOCAL_KEY_ID } from "@ai-hub/db";
import type { ProviderKeyDto } from "@ai-hub/shared";
import { isE2eMode } from "./e2e-mode";

export { OLLAMA_LOCAL_KEY_ID };

export interface LocalProviderStatus {
  available: boolean;
  models: Array<{ id: string; label: string }>;
  pdfRagAvailable: true;
}

let cached: { value: LocalProviderStatus; expiresAt: number } | null = null;

export async function getLocalProviderStatus(force = false): Promise<LocalProviderStatus> {
  if (isE2eMode() && process.env.AI_HUB_E2E_OLLAMA_MODEL) {
    const id = process.env.AI_HUB_E2E_OLLAMA_MODEL;
    return { available: true, models: [{ id, label: id }], pdfRagAvailable: true };
  }
  if (!force && cached && cached.expiresAt > Date.now()) return cached.value;
  let value: LocalProviderStatus;
  try {
    const models = await createOllamaAdapter({ timeoutMs: 2_000 }).discoverModels(AbortSignal.timeout(2_000));
    value = { available: true, models: models.slice(0, 256), pdfRagAvailable: true };
  } catch {
    value = { available: false, models: [], pdfRagAvailable: true };
  }
  cached = { value, expiresAt: Date.now() + 5_000 };
  return value;
}

export function localProviderKey(): ProviderKeyDto {
  return {
    id: OLLAMA_LOCAL_KEY_ID,
    providerSlug: "ollama",
    label: "Ollama local",
    maskedKey: "local…",
    last4: "local",
    status: "active",
    endpointUrl: null,
    createdAt: "2026-09-23T00:00:00.000Z",
  };
}
