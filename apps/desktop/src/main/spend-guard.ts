import {
  DEFAULT_ESTIMATED_OUTPUT_TOKENS,
  evaluateSpendCaps,
  estimateCostUsd,
  findCatalogModel,
  isSpendCapScope,
  type SpendCapLimits,
  type SpendCapScope,
} from "@ai-hub/shared";
import type { SpendCapRecord } from "@ai-hub/db";

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
