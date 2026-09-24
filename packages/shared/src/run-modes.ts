import { z } from "zod";

export const runModeSchema = z.enum(["plan", "assist", "agent", "orchestrate", "research"]);
export type RunMode = z.infer<typeof runModeSchema>;
export const effortLevelSchema = z.enum(["low", "medium", "high", "max"]);
export type EffortLevel = z.infer<typeof effortLevelSchema>;

export interface EffortParams { maxTokens: number; temperature: number; thinkingBudget: number; }
export function effortParams(level: EffortLevel): EffortParams {
  switch (level) {
    case "low": return { maxTokens: 512, temperature: 0.8, thinkingBudget: 0 };
    case "medium": return { maxTokens: 1024, temperature: 0.7, thinkingBudget: 256 };
    case "high": return { maxTokens: 2048, temperature: 0.5, thinkingBudget: 1024 };
    case "max": return { maxTokens: 4096, temperature: 0.3, thinkingBudget: 2048 };
  }
}
