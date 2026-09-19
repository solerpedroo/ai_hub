import { describe, expect, it } from "vitest";
import {
  mentionTriggerIn,
  mentionVisibleContent,
  parseMentionTokens,
  projectFileNameMatches,
} from "./mentions";

describe("parseMentionTokens", () => {
  it("strips @file:README.md and keeps the question", () => {
    const parsed = parseMentionTokens("@file:README.md o que este repo faz?");
    expect(parsed.body).toBe("o que este repo faz?");
    expect(parsed.mentions).toEqual([
      { type: "file", query: "README.md", raw: "@file:README.md" },
    ]);
    expect(mentionVisibleContent("@file:README.md o que este repo faz?")).toBe(
      "o que este repo faz?",
    );
  });

  it("keeps the short token when the body is only a mention", () => {
    expect(mentionVisibleContent("@file:README.md")).toBe("@file:README.md");
  });

  it("leaves unknown @tokens in the body", () => {
    const parsed = parseMentionTokens("see @unknown:thing please");
    expect(parsed.mentions).toEqual([]);
    expect(parsed.body).toContain("@unknown:thing");
  });
});

describe("projectFileNameMatches", () => {
  it("matches a stem so @file:diff resolves diff.md", () => {
    expect(projectFileNameMatches("diff.md", "diff")).toBe(true);
    expect(projectFileNameMatches("README.md", "README.md")).toBe(true);
    expect(projectFileNameMatches("src/app.ts", "app")).toBe(true);
    expect(projectFileNameMatches("notes.txt", "diff")).toBe(false);
  });
});

describe("mentionTriggerIn", () => {
  it("detects an @ trigger at the caret", () => {
    const text = "hello @fi";
    expect(mentionTriggerIn(text, text.length)).toEqual({ start: 6, typed: "@fi" });
  });

  it("ignores email-like mid-word at-signs", () => {
    expect(mentionTriggerIn("a@b", 3)).toBeNull();
  });
});
