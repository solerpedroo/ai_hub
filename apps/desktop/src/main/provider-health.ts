import { gatewayErrorCode, resolveAdapter, createMockOpenAIAdapter, type ProviderAdapter } from "@ai-hub/ai-gateway";
import type { SecretsTestResult } from "@ai-hub/shared";
import { isE2eMode } from "./e2e-mode";
import { getHubDatabase } from "./persistence";

export async function testProviderKey(id: string): Promise<SecretsTestResult> {
  const started = Date.now();
  const repos = getHubDatabase().repos;
  const key = await repos.getProviderSecret(id);
  if (!key) {
    throw new Error("Provider key is missing");
  }

  let adapter: ProviderAdapter;
  if (isE2eMode()) {
    adapter = createMockOpenAIAdapter();
  } else if (key.providerSlug === "custom") {
    const baseUrl = repos.getCustomBaseUrl(key.id);
    if (baseUrl === null) {
      const latencyMs = Math.max(0, Date.now() - started);
      repos.recordHealthSample({ providerSlug: key.providerSlug, ok: false, latencyMs });
      return { ok: false, latencyMs, errorCode: "unknown" };
    }
    adapter = resolveAdapter("custom", { baseUrl });
  } else {
    adapter = resolveAdapter(key.providerSlug);
  }

  try {
    await adapter.testConnection(key.secret, AbortSignal.timeout(15_000));
    const latencyMs = Math.max(0, Date.now() - started);
    repos.recordHealthSample({ providerSlug: key.providerSlug, ok: true, latencyMs });
    return { ok: true, latencyMs, errorCode: null };
  } catch (error) {
    const latencyMs = Math.max(0, Date.now() - started);
    const errorCode = gatewayErrorCode(error);
    repos.recordHealthSample({ providerSlug: key.providerSlug, ok: false, latencyMs });
    return { ok: false, latencyMs, errorCode };
  }
}
