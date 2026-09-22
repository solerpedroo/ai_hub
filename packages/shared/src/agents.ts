import { z } from "zod";

export const AGENT_MAX_STEPS = 6;
export const AGENT_MAX_READ_PATHS = 3;
export const ORCHESTRATION_MAX_PARALLEL_NODES = 2;
export const agentRunKindSchema = z.enum(["single", "orchestrated"]);
export const agentRoleSchema = z.enum(["single", "supervisor", "explorer", "reviewer", "writer"]);
export const agentBudgetModeSchema = z.enum(["single", "shared", "per_node"]);
export const agentHandoffJoinKindSchema = z.enum(["sequential", "parallel"]);
export const agentHandoffStatusSchema = z.enum(["pending", "ready", "consumed", "cancelled", "interrupted"]);
export type AgentRunKind = z.infer<typeof agentRunKindSchema>;
export type AgentRole = z.infer<typeof agentRoleSchema>;
export type AgentBudgetMode = z.infer<typeof agentBudgetModeSchema>;

export const agentRunStatusSchema = z.enum([
  "awaiting_confirmation",
  "running",
  "paused",
  "cancelled",
  "completed",
  "completed_with_errors",
  "stopped_budget",
  "stopped_timeout",
  "interrupted",
  "failed",
]);
export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>;

export const agentStepStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
  "cancelled",
  "interrupted",
]);
export type AgentStepStatus = z.infer<typeof agentStepStatusSchema>;

export const agentStepKindSchema = z.enum(["plan", "tool", "report", "artifact"]);
export type AgentStepKind = z.infer<typeof agentStepKindSchema>;

export const agentBudgetUsdSchema = z.string().regex(/^\d+(?:\.\d{1,6})?$/).refine((value) => Number(value) > 0 && Number(value) <= 1000);
