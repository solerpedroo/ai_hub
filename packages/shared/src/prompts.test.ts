import { describe, expect, it } from "vitest";
import { FACTORY_PROMPTS, interpolatePrompt, isPromptFolder } from "./prompts";

describe("interpolatePrompt", () => {
  it("resolves project, language, and goal against the active context", () => {
    const text = interpolatePrompt(
      "Review {{project}} in {{language}}. Goal: {{goal}}.",
      { project: "E2E", language: "pt-BR", goal: "ship the compiler" },
    );
    expect(text).toBe("Review E2E in pt-BR. Goal: ship the compiler.");
  });

  it("leaves unknown placeholders and empty values as-is or blank", () => {
    expect(interpolatePrompt("Keep {{unknown}} and {{project}}", { project: "", language: "en", goal: "" })).toBe(
      "Keep {{unknown}} and ",
    );
  });
});

describe("factory prompts", () => {
  it("covers the four factory ids in the three library folders", () => {
    expect(FACTORY_PROMPTS.map((item) => item.factoryId)).toEqual([
      "code-review",
      "debug",
      "summary",
      "teacher",
    ]);
    expect(new Set(FACTORY_PROMPTS.map((item) => item.folder))).toEqual(
      new Set(["development", "studies", "work"]),
    );
    expect(isPromptFolder("development")).toBe(true);
    expect(isPromptFolder("inbox")).toBe(false);
    for (const prompt of FACTORY_PROMPTS) {
      expect(prompt.body).toContain("{{project}}");
      expect(prompt.body).toContain("{{language}}");
      expect(prompt.body).toContain("{{goal}}");
    }
  });
});
