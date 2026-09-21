import { describe, expect, it } from "vitest";
import { effortParams, runModeSchema } from "./run-modes";

describe("run modes", () => {
  it("maps effort deterministically without changing model identity", () => {
    expect(effortParams("max")).toEqual({ maxTokens: 4096, temperature: 0.3, thinkingBudget: 2048 });
    expect(runModeSchema.parse("agent")).toBe("agent");
  });
});
