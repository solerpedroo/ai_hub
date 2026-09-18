import { describe, expect, it } from "vitest";
import { evaluateSpendCaps, parseSpendCapError, SpendCapError, usdToMicros } from "./spend-caps";

describe("spend caps", () => {
  it("treats a missing limit as unlimited", () => {
    const result = evaluateSpendCaps({
      estimatedRequestUsd: "1.000000",
      daySpentUsd: "9.000000",
      globalSpentUsd: "99.000000",
      limits: {},
    });
    expect(result.blocked).toBeNull();
    expect(result.warnings).toEqual([]);
  });

  it("warns at 80% and blocks at 100%", () => {
    const warn = evaluateSpendCaps({
      estimatedRequestUsd: "8.000000",
      daySpentUsd: "0.000000",
      globalSpentUsd: "0.000000",
      limits: { request: "10.000000" },
    });
    expect(warn.blocked).toBeNull();
    expect(warn.warnings).toEqual(["request"]);

    const block = evaluateSpendCaps({
      estimatedRequestUsd: "10.000000",
      daySpentUsd: "0.000000",
      globalSpentUsd: "0.000000",
      limits: { request: "10.000000" },
    });
    expect(block.blocked).toBe("request");
  });

  it("blocks a zero request cap when the estimate is positive", () => {
    const result = evaluateSpendCaps({
      estimatedRequestUsd: "0.000001",
      daySpentUsd: "0.000000",
      globalSpentUsd: "0.000000",
      limits: { request: "0" },
    });
    expect(result.blocked).toBe("request");
  });

  it("skips the request cap when there is no catalog estimate", () => {
    const result = evaluateSpendCaps({
      estimatedRequestUsd: null,
      daySpentUsd: "0.000000",
      globalSpentUsd: "0.000000",
      limits: { request: "0" },
    });
    expect(result.blocked).toBeNull();
  });

  it("adds the estimate onto day and global spend", () => {
    const result = evaluateSpendCaps({
      estimatedRequestUsd: "1.000000",
      daySpentUsd: "4.500000",
      globalSpentUsd: "9.000000",
      limits: { day: "5.000000", global: "20.000000" },
    });
    expect(result.blocked).toBe("day");
    expect(result.dayUsd).toBe("5.500000");
    expect(result.globalUsd).toBe("10.000000");
  });

  it("parses a SpendCapError message even when Electron wraps it", () => {
    const error = new SpendCapError("global");
    expect(parseSpendCapError(`Error invoking remote method 'chat:send': Error: ${error.message}`)).toBe(
      "global",
    );
    expect(usdToMicros("1.250000")).toBe(1_250_000);
  });
});
