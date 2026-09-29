import { describe, expect, it } from "vitest";
import { enterpriseAnalyticsDtoSchema, organizationPolicyUpdateInputSchema } from "./enterprise";

describe("enterprise contracts", () => {
  it("accepts a complete local governance policy and rejects unknown fields", () => {
    const input = {
      organizationId: "11111111-1111-4111-8111-111111111111",
      policy: {
        allowedModels: ["gpt-4o-mini"],
        toolPolicy: { allowReadTools: true, allowWriteTools: false, blockPii: true },
        teamMonthlyLimitUsd: "12.500000",
        analyticsOptIn: true,
      },
    };
    expect(organizationPolicyUpdateInputSchema.parse(input).policy.allowedModels).toEqual(["gpt-4o-mini"]);
    expect(() => organizationPolicyUpdateInputSchema.parse({ ...input, unexpected: true })).toThrow();
  });

  it("only exposes aggregate analytics", () => {
    expect(enterpriseAnalyticsDtoSchema.parse({ organizationId: "11111111-1111-4111-8111-111111111111", metrics: [{ metric: "chat.requested", value: 3 }] })).toEqual({ organizationId: "11111111-1111-4111-8111-111111111111", metrics: [{ metric: "chat.requested", value: 3 }] });
    expect(() => enterpriseAnalyticsDtoSchema.parse({ organizationId: "11111111-1111-4111-8111-111111111111", metrics: [{ metric: "chat.requested", value: -1 }] })).toThrow();
  });
});
