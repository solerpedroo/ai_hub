export const SPEND_CAP_SCOPES = ["request", "day", "global"] as const;

export type SpendCapScope = (typeof SPEND_CAP_SCOPES)[number];
export type CapBlockScope = SpendCapScope | "project" | "provider";

const MICROS = 1_000_000;
export const SPEND_CAP_WARN_RATIO = 0.8;
export const DEFAULT_ESTIMATED_OUTPUT_TOKENS = 1024;

export class SpendCapError extends Error {
  readonly scope: CapBlockScope;

  constructor(scope: CapBlockScope) {
    super(`cap_exceeded:${scope}`);
    this.name = "SpendCapError";
    this.scope = scope;
  }
}

export function isSpendCapScope(value: string): value is SpendCapScope {
  return (SPEND_CAP_SCOPES as readonly string[]).includes(value);
}

export function usdToMicros(value: string): number {
  const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(value);
  if (!match) {
    throw new Error("Invalid USD amount");
  }
  const whole = Number(match[1]);
  const frac = (match[2] ?? "").padEnd(6, "0");
  return whole * MICROS + Number(frac);
}

export function microsToUsd(micros: number): string {
  const sign = micros < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(micros));
  const whole = Math.floor(abs / MICROS);
  const frac = String(abs % MICROS).padStart(6, "0");
  return `${sign}${whole}.${frac}`;
}

export function addUsd(left: string, right: string): string {
  return microsToUsd(usdToMicros(left) + usdToMicros(right));
}

export type SpendCapLimits = Partial<Record<SpendCapScope, string>>;

export interface SpendCapEvaluation {
  blocked: SpendCapScope | null;
  warnings: SpendCapScope[];
  requestUsd: string;
  dayUsd: string;
  globalUsd: string;
}

export function evaluateSpendCaps(input: {
  estimatedRequestUsd: string | null;
  daySpentUsd: string;
  globalSpentUsd: string;
  limits: SpendCapLimits;
}): SpendCapEvaluation {
  const estimate = input.estimatedRequestUsd ?? "0.000000";
  const requestUsd = estimate;
  const dayUsd = addUsd(input.daySpentUsd, estimate);
  const globalUsd = addUsd(input.globalSpentUsd, estimate);
  const usage: Record<(typeof SPEND_CAP_SCOPES)[number], string> = {
    request: requestUsd,
    day: dayUsd,
    global: globalUsd,
  };
  const warnings: SpendCapScope[] = [];
  let blocked: SpendCapScope | null = null;

  for (const scope of SPEND_CAP_SCOPES) {
    const limit = input.limits[scope];
    if (limit === undefined) {
      continue;
    }
    if (scope === "request" && input.estimatedRequestUsd === null) {
      continue;
    }
    const used = usdToMicros(usage[scope]);
    const cap = usdToMicros(limit);
    if (used >= cap) {
      blocked = blocked ?? scope;
      continue;
    }
    if (cap > 0 && used / cap >= SPEND_CAP_WARN_RATIO) {
      warnings.push(scope);
    }
  }

  return { blocked, warnings, requestUsd, dayUsd, globalUsd };
}

export function evaluatePlaygroundCaps(input: {
  estimates: readonly (string | null)[];
  daySpentUsd: string;
  globalSpentUsd: string;
  limits: SpendCapLimits;
}): SpendCapEvaluation {
  const hasUsdCap = SPEND_CAP_SCOPES.some((scope) => input.limits[scope] !== undefined);
  if (hasUsdCap && input.estimates.some((item) => item === null)) {
    const blocked = SPEND_CAP_SCOPES.find((scope) => input.limits[scope] !== undefined) ?? "request";
    return {
      blocked,
      warnings: [],
      requestUsd: "0.000000",
      dayUsd: input.daySpentUsd,
      globalUsd: input.globalSpentUsd,
    };
  }
  let combined = "0.000000";
  for (const item of input.estimates) {
    if (item !== null) {
      combined = addUsd(combined, item);
    }
  }
  return evaluateSpendCaps({
    estimatedRequestUsd: input.estimates.length === 0 ? null : combined,
    daySpentUsd: input.daySpentUsd,
    globalSpentUsd: input.globalSpentUsd,
    limits: input.limits,
  });
}

export function parseSpendCapError(message: string): CapBlockScope | null {
  const match = /cap_exceeded:(request|day|global|project|provider)/.exec(message);
  if (!match) {
    return null;
  }
  return match[1] as CapBlockScope;
}
