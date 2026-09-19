import { describe, expect, it } from "vitest";
import {
  composeSkillPrompt,
  FACTORY_SKILLS,
  factorySkillContract,
  interpolateSkillText,
  isSkillFolder,
  parseSkillSlashDraft,
  skillContractV1Schema,
} from "./skills";

describe("skills contract", () => {
  it("seeds five factory skills with a versioned empty tools hook", () => {
    expect(FACTORY_SKILLS.map((item) => item.factoryId)).toEqual([
      "code-review",
      "summarize-pdf",
      "meeting-prep",
      "explain-error",
      "write-rfc",
    ]);
    expect(new Set(FACTORY_SKILLS.map((item) => item.folder))).toEqual(
      new Set(["development", "work"]),
    );
    for (const skill of FACTORY_SKILLS) {
      const contract = factorySkillContract(skill);
      expect(contract.version).toBe(1);
      expect(contract.kind).toBe("skill");
      expect(contract.tools).toEqual([]);
      expect(contract.steps.length).toBeGreaterThan(0);
      expect(isSkillFolder(skill.folder)).toBe(true);
    }
    const review = FACTORY_SKILLS.find((item) => item.factoryId === "code-review");
    expect(review?.steps.map((step) => step.title)).toEqual(["Summary", "Risks", "Suggestions"]);
  });

  it("rejects tools in the v1 contract", () => {
    expect(() =>
      skillContractV1Schema.parse({
        version: 1,
        kind: "skill",
        prompt: "Review",
        steps: [{ id: "one", title: "One", section: "Do one thing." }],
        defaultMentions: [],
        tools: [{ name: "bash" }],
      }),
    ).toThrow();
  });

  it("composes step sections and interpolates project variables", () => {
    const text = composeSkillPrompt("Review {{project}}.", [
      { id: "summary", title: "Summary", section: "Write a summary." },
    ]);
    expect(text).toContain("Review {{project}}.");
    expect(text).toContain("## Step 1: Summary");
    expect(
      interpolateSkillText(text, { project: "E2E", language: "English", goal: "Ship" }),
    ).toContain("Review E2E.");
  });

  it("parses /skill with a name and leftover mentions", () => {
    expect(parseSkillSlashDraft("/skill Code Review\n@file:diff")).toEqual({
      query: "Code Review",
      remainder: "@file:diff",
    });
    expect(parseSkillSlashDraft("/skill Code Review @file:diff extra")).toEqual({
      query: "Code Review",
      remainder: "@file:diff extra",
    });
    expect(parseSkillSlashDraft("/skill")).toEqual({ query: null, remainder: "" });
    expect(parseSkillSlashDraft("just text")).toBeNull();
  });
});
