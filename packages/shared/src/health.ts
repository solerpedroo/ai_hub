export interface HealthSampleLike {
  providerSlug: string;
  ok: boolean;
  latencyMs: number | null;
  createdAt: string;
}

export interface HealthSummary {
  providerSlug: string;
  lastOk: boolean | null;
  lastLatencyMs: number | null;
  errorRate: number;
  sampleCount: number;
}

export const HEALTH_WINDOW = 20;

export function summarizeProviderHealth(
  samples: readonly HealthSampleLike[],
  lastN = HEALTH_WINDOW,
): HealthSummary[] {
  const grouped = new Map<string, HealthSampleLike[]>();
  const ordered = [...samples].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  for (const sample of ordered) {
    const bucket = grouped.get(sample.providerSlug) ?? [];
    if (bucket.length < lastN) {
      bucket.push(sample);
      grouped.set(sample.providerSlug, bucket);
    }
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([providerSlug, window]) => {
      const latest = window[0] ?? null;
      const failures = window.filter((item) => !item.ok).length;
      return {
        providerSlug,
        lastOk: latest ? latest.ok : null,
        lastLatencyMs: latest ? latest.latencyMs : null,
        errorRate: window.length === 0 ? 0 : failures / window.length,
        sampleCount: window.length,
      };
    });
}
