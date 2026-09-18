import { describe, expect, it } from "vitest";
import { suggestFallbackProvider } from "./fallback";
import { summarizeProviderHealth } from "./health";
import { classifyHubIpcError } from "./hub-error";

describe("provider health summaries", () => {
  it("uses the latest N samples per slug and sorts slugs", () => {
    const summaries = summarizeProviderHealth(
      [
        { providerSlug: "openai", ok: true, latencyMs: 80, createdAt: "2026-09-17T01:00:00.000Z" },
        { providerSlug: "anthropic", ok: false, latencyMs: 400, createdAt: "2026-09-17T02:00:00.000Z" },
        { providerSlug: "openai", ok: false, latencyMs: 200, createdAt: "2026-09-17T03:00:00.000Z" },
      ],
      20,
    );
    expect(summaries.map((item) => item.providerSlug)).toEqual(["anthropic", "openai"]);
    const openai = summaries.find((item) => item.providerSlug === "openai");
    expect(openai?.lastOk).toBe(false);
    expect(openai?.errorRate).toBe(0.5);
    expect(openai?.sampleCount).toBe(2);
  });
});

describe("explicit fallback", () => {
  it("never suggests the failed provider and prefers a healthy slug", () => {
    const suggestion = suggestFallbackProvider({
      failedProvider: "anthropic",
      keys: [
        { id: "11111111-1111-4111-8111-111111111111", providerSlug: "anthropic", status: "active" },
        { id: "22222222-2222-4222-8222-222222222222", providerSlug: "openai", status: "active" },
        { id: "33333333-3333-4333-8333-333333333333", providerSlug: "groq", status: "invalid" },
      ],
      summaries: [
        { providerSlug: "openai", lastOk: true, lastLatencyMs: 90, errorRate: 0, sampleCount: 3 },
        { providerSlug: "groq", lastOk: true, lastLatencyMs: 20, errorRate: 0, sampleCount: 1 },
      ],
    });
    expect(suggestion?.providerSlug).toBe("openai");
    expect(suggestion?.keyId).toBe("22222222-2222-4222-8222-222222222222");
    expect(suggestion?.model).toBe("gpt-4o-mini");
  });

  it("returns null when the only keys belong to the failed provider", () => {
    expect(
      suggestFallbackProvider({
        failedProvider: "openai",
        keys: [{ id: "11111111-1111-4111-8111-111111111111", providerSlug: "openai", status: "active" }],
        summaries: [],
      }),
    ).toBeNull();
  });
});

describe("hub IPC error taxonomy", () => {
  it("classifies cap, unknown model, and gateway codes", () => {
    expect(classifyHubIpcError("Error: cap_exceeded:day")).toEqual({
      kind: "cap",
      scope: "day",
      code: null,
    });
    expect(classifyHubIpcError("unknown_model")).toEqual({
      kind: "unknown_model",
      scope: null,
      code: null,
    });
    expect(classifyHubIpcError("gateway:auth")).toEqual({
      kind: "gateway",
      scope: null,
      code: "auth",
    });
  });
});
