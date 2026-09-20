export const COUNCIL_ROLES = ["architect", "reviewer", "security", "ux"] as const;
export type CouncilRole = (typeof COUNCIL_ROLES)[number];

export interface RouterRecommendation {
  tier: "fast" | "balanced" | "frontier";
  reason: "simple" | "code" | "complex";
}

export function recommendModelRoute(prompt: string): RouterRecommendation {
  const text = prompt.toLowerCase();
  if (/\b(security|threat|vulnerab|architecture|refactor|distributed|debug)\b/.test(text) || text.length > 1_200) {
    return { tier: "frontier", reason: "complex" };
  }
  if (/\b(code|typescript|javascript|python|sql|test)\b/.test(text)) return { tier: "balanced", reason: "code" };
  return { tier: "fast", reason: "simple" };
}

export function divergenceTerms(responses: readonly string[]): string[] {
  if (responses.length < 2) return [];
  const sets = responses.map((value) => new Set(value.toLowerCase().match(/[\p{L}\p{N}_-]{4,}/gu) ?? []));
  const counts = new Map<string, number>();
  for (const terms of sets) for (const term of terms) counts.set(term, (counts.get(term) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 0 && count < responses.length)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([term]) => term);
}
