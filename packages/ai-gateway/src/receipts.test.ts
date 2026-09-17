import { describe, expect, it } from "vitest";
import { composeReceipt } from "./receipts";

describe("composeReceipt", () => {
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
});
