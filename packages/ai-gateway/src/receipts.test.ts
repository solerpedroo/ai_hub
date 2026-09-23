import { describe, expect, it } from "vitest";
import { composeReceipt } from "./receipts";

describe("composeReceipt", () => {
  it("records zero cost and measured latency for local models without catalog prices", () => {
    expect(composeReceipt({ provider: "ollama", model: "llama3.2:latest", tokensIn: 12, tokensOut: 4, estimatedIn: 1, estimatedOut: 1, latencyMs: 57, errorCode: null })).toMatchObject({ costUsd: "0.000000", latencyMs: 57, tokensIn: 12, tokensOut: 4 });
  });
  it("uses catalog prices when usage is present", () => {
    const receipt = composeReceipt({
      provider: "openai",
      model: "gpt-4o-mini",
      tokensIn: 1_000_000,
      tokensOut: 0,
      estimatedIn: 1,
      estimatedOut: 1,
      latencyMs: 40,
      errorCode: null,
    });
    expect(receipt.costUsd).toBe("0.150000");
    expect(receipt.tokensIn).toBe(1_000_000);
    expect(receipt.errorCode).toBeNull();
  });

  it("falls back to estimated tokens and still writes an error code", () => {
    const receipt = composeReceipt({
      provider: "openai",
      model: "gpt-4o-mini",
      tokensIn: null,
      tokensOut: null,
      estimatedIn: 8,
      estimatedOut: 4,
      latencyMs: 12,
      errorCode: "network",
    });
    expect(receipt.tokensIn).toBe(8);
    expect(receipt.tokensOut).toBe(4);
    expect(receipt.errorCode).toBe("network");
    expect(receipt.costUsd).not.toBeNull();
  });

  it("prefers provider-reported cost over the local catalog", () => {
    const receipt = composeReceipt({
      provider: "openrouter",
      model: "openai/gpt-4o-mini",
      tokensIn: 1_000_000,
      tokensOut: 1_000_000,
      estimatedIn: 1,
      estimatedOut: 1,
      latencyMs: 40,
      errorCode: null,
      reportedCostUsd: "0.000042",
    });
    expect(receipt.costUsd).toBe("0.000042");
  });
});
