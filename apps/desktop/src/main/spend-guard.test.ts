import { describe, expect, it } from "vitest";
import { estimateOutgoingCostUsd, evaluateOutgoingCaps, evaluateScopedOutgoingCaps } from "./spend-guard";

describe("local zero-cost spend caps", () => {
  it("does not block an Ollama send after USD limits are exhausted", () => {
    const estimate = estimateOutgoingCostUsd("llama3.2", "ollama", 100, 100);
    expect(estimate).toBe("0.000000");
    expect(evaluateOutgoingCaps({
      providerSlug: "ollama",
      estimatedRequestUsd: estimate,
      daySpentUsd: "5.000000",
      globalSpentUsd: "10.000000",
      limits: { request: "0", day: "5.000000", global: "10.000000" },
    })).toEqual({ blocked: null, warnings: [] });
    expect(evaluateScopedOutgoingCaps({
      providerSlug: "ollama",
      estimatedRequestUsd: estimate,
      spentUsd: "5.000000",
      limitUsd: "5.000000",
      scope: "project",
    })).toEqual({ blocked: null, warnings: [] });
  });

  it("keeps hard-stop caps for a cloud estimate rounded to zero", () => {
    expect(evaluateOutgoingCaps({
      providerSlug: "openai",
      estimatedRequestUsd: "0.000000",
      daySpentUsd: "5.000000",
      globalSpentUsd: "10.000000",
      limits: { day: "5.000000" },
    }).blocked).toBe("day");
    expect(evaluateScopedOutgoingCaps({
      providerSlug: "openai",
      estimatedRequestUsd: "0.000000",
      spentUsd: "5.000000",
      limitUsd: "5.000000",
      scope: "project",
    }).blocked).toBe("project");
  });
});
