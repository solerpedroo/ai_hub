import {
  DEFAULT_ESTIMATED_OUTPUT_TOKENS,
  addUsd,
  evaluatePlaygroundCaps,
  evaluateSpendCaps,
  estimateCostUsd,
  findCatalogModel,
  isSpendCapScope,
  type SpendCapLimits,
  type SpendCapScope,
} from "@ai-hub/shared";
import type { HubRepos, SpendCapRecord } from "@ai-hub/db";

export function localDayStartMs(now = Date.now()): number {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function spendCapLimitsFromRows(rows: readonly SpendCapRecord[]): SpendCapLimits {
  const limits: SpendCapLimits = {};
  for (const row of rows) {
    if (isSpendCapScope(row.scope)) {
      limits[row.scope] = row.limitUsd;
    }
  }
  return limits;
}

export function estimateOutgoingCostUsd(
  model: string,
  providerSlug: string,
  tokensIn: number,
  maxTokens: number | null | undefined,
): string | null {
  const catalog = findCatalogModel(model, providerSlug);
  if (!catalog) {
    return null;
  }
  const tokensOut = maxTokens ?? DEFAULT_ESTIMATED_OUTPUT_TOKENS;
  return estimateCostUsd(catalog, tokensIn, tokensOut);
}

export function evaluateOutgoingCaps(input: {
  estimatedRequestUsd: string | null;
  daySpentUsd: string;
  globalSpentUsd: string;
  limits: SpendCapLimits;
}): { blocked: SpendCapScope | null; warnings: SpendCapScope[] } {
  const result = evaluateSpendCaps(input);
  return { blocked: result.blocked, warnings: result.warnings };
}

export function evaluateScopedOutgoingCaps(input: {
  estimatedRequestUsd: string | null;
  spentUsd: string;
  limitUsd: string | null;
  scope: "project" | "provider";
}): { blocked: "project" | "provider" | null; warnings: ("project" | "provider")[] } {
  if (input.limitUsd === null || input.estimatedRequestUsd === null) return { blocked: null, warnings: [] };
  const result = evaluateSpendCaps({
    estimatedRequestUsd: input.estimatedRequestUsd,
    daySpentUsd: input.spentUsd,
    globalSpentUsd: input.spentUsd,
    limits: { global: input.limitUsd },
  });
  return { blocked: result.blocked ? input.scope : null, warnings: result.warnings.length > 0 ? [input.scope] : [] };
}

export function evaluateBatchScopedCaps(input: {
  estimates: readonly { usd: string | null; projectId: string | null; providerSlug: string }[];
  repos: HubRepos;
}): { blocked: "request" | "day" | "global" | "project" | "provider" | null } {
  const base = evaluatePlaygroundCaps({
    estimates: input.estimates.map((item) => item.usd),
    daySpentUsd: addUsd(input.repos.sumReceiptCostUsd({ sinceMs: localDayStartMs() }), input.repos.sumReservedSpendUsd({ sinceMs: localDayStartMs() })),
    globalSpentUsd: addUsd(input.repos.sumReceiptCostUsd({}), input.repos.sumReservedSpendUsd({})),
    limits: spendCapLimitsFromRows(input.repos.listSpendCaps()),
  });
  if (base.blocked) return { blocked: base.blocked };
  const scoped = input.repos.listScopedSpendCaps();
  for (const [dimension, subjectId] of [["project", input.estimates[0]?.projectId], ["provider", null]] as const) {
    if (dimension === "project" && subjectId) {
      const limit = scoped.find((row) => row.dimension === "project" && row.subjectId === subjectId)?.limitUsd ?? null;
      const projectEstimates = input.estimates.filter((item) => item.projectId === subjectId).map((item) => item.usd);
      if (limit !== null && projectEstimates.some((item) => item === null)) return { blocked: "project" };
      const usd = projectEstimates.reduce<string>((sum, item) => item === null ? sum : addUsd(sum, item), "0.000000");
      if (evaluateScopedOutgoingCaps({ estimatedRequestUsd: usd, spentUsd: addUsd(input.repos.sumReceiptCostUsd({ projectId: subjectId }), input.repos.sumReservedSpendUsd({ projectId: subjectId })), limitUsd: limit, scope: "project" }).blocked) return { blocked: "project" };
    }
  }
  for (const providerSlug of new Set(input.estimates.map((item) => item.providerSlug))) {
    const limit = scoped.find((row) => row.dimension === "provider" && row.subjectId === providerSlug)?.limitUsd ?? null;
    const providerEstimates = input.estimates.filter((item) => item.providerSlug === providerSlug).map((item) => item.usd);
    if (limit !== null && providerEstimates.some((item) => item === null)) return { blocked: "provider" };
    const usd = providerEstimates.reduce<string>((sum, item) => item === null ? sum : addUsd(sum, item), "0.000000");
    if (evaluateScopedOutgoingCaps({ estimatedRequestUsd: usd, spentUsd: addUsd(input.repos.sumReceiptCostUsd({ providerSlug }), input.repos.sumReservedSpendUsd({ providerSlug })), limitUsd: limit, scope: "provider" }).blocked) return { blocked: "provider" };
  }
  return { blocked: null };
}
