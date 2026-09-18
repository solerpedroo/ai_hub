import { describe, expect, it } from "vitest";
import { shouldShowOnboarding, sortProvidersForWizard, WIZARD_TTFT_BUDGET_MS } from "./onboarding";

describe("onboarding gate", () => {
  it("skips when a key already exists or the wizard finished", () => {
    expect(shouldShowOnboarding({ hasProviderKey: true, onboardingComplete: false })).toBe(false);
    expect(shouldShowOnboarding({ hasProviderKey: false, onboardingComplete: true })).toBe(false);
    expect(shouldShowOnboarding({ hasProviderKey: false, onboardingComplete: false })).toBe(true);
  });

  it("puts OpenRouter first among known slugs", () => {
    const sorted = sortProvidersForWizard([
      { slug: "groq" },
      { slug: "openai" },
      { slug: "openrouter" },
      { slug: "custom" },
    ]);
    expect(sorted.map((item) => item.slug)).toEqual(["openrouter", "openai", "groq", "custom"]);
  });

  it("keeps the 90s TTFT budget as a constant the UI can log against", () => {
    expect(WIZARD_TTFT_BUDGET_MS).toBe(90_000);
  });
});
