export const WIZARD_PROVIDER_ORDER = [
  "openrouter",
  "openai",
  "anthropic",
  "gemini",
  "groq",
  "custom",
] as const;

export const WIZARD_TTFT_BUDGET_MS = 90_000;

export function shouldShowOnboarding(input: {
  hasProviderKey: boolean;
  onboardingComplete: boolean;
}): boolean {
  if (input.hasProviderKey || input.onboardingComplete) {
    return false;
  }
  return true;
}

export function sortProvidersForWizard<T extends { slug: string }>(providers: readonly T[]): T[] {
  return [...providers].sort((left, right) => {
    const leftRank = WIZARD_PROVIDER_ORDER.indexOf(left.slug as (typeof WIZARD_PROVIDER_ORDER)[number]);
    const rightRank = WIZARD_PROVIDER_ORDER.indexOf(right.slug as (typeof WIZARD_PROVIDER_ORDER)[number]);
    const leftIndex = leftRank === -1 ? WIZARD_PROVIDER_ORDER.length : leftRank;
    const rightIndex = rightRank === -1 ? WIZARD_PROVIDER_ORDER.length : rightRank;
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }
    return left.slug.localeCompare(right.slug);
  });
}
