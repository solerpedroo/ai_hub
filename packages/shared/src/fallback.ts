import { catalogModelsForProvider } from "./model-catalog";
import type { HealthSummary } from "./health";

export interface FallbackKeyLike {
  id: string;
  providerSlug: string;
  status: "active" | "invalid";
}

export interface FallbackSuggestion {
  keyId: string;
  providerSlug: string;
  model: string;
}

function scoreSummary(summary: HealthSummary | undefined): number {
  if (!summary || summary.lastOk === null) {
    return 1;
  }
  if (summary.lastOk) {
    return 2;
  }
  return 0;
}

export function suggestFallbackProvider(input: {
  failedProvider: string;
  keys: readonly FallbackKeyLike[];
  summaries: readonly HealthSummary[];
}): FallbackSuggestion | null {
  const bySlug = new Map(input.summaries.map((item) => [item.providerSlug, item]));
  const candidates = input.keys.filter(
    (key) => key.status === "active" && key.providerSlug !== input.failedProvider,
  );
  if (candidates.length === 0) {
    return null;
  }
  const ranked = [...candidates].sort((left, right) => {
    const scoreDiff = scoreSummary(bySlug.get(right.providerSlug)) - scoreSummary(bySlug.get(left.providerSlug));
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return left.providerSlug.localeCompare(right.providerSlug);
  });
  const chosen = ranked[0];
  if (!chosen) {
    return null;
  }
  const model = catalogModelsForProvider(chosen.providerSlug)[0]?.id;
  if (!model) {
    return null;
  }
  return { keyId: chosen.id, providerSlug: chosen.providerSlug, model };
}
