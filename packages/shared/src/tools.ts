import { z } from "zod";

export const TOOL_ID_PROJECT_FILESYSTEM_READ = "project-filesystem.read-file" as const;
export const TOOL_ID_DEVELOPER_EXPLORER = "developer.explorer.read" as const;
export const TOOL_ID_DEVELOPER_GIT = "developer.git.read" as const;
export const TOOL_ID_DEVELOPER_TERMINAL = "developer.terminal.execute" as const;
export const TOOL_ID_DEVELOPER_REVIEW = "developer.git.review" as const;
export const toolIdSchema = z.enum([TOOL_ID_PROJECT_FILESYSTEM_READ, TOOL_ID_DEVELOPER_EXPLORER, TOOL_ID_DEVELOPER_GIT, TOOL_ID_DEVELOPER_TERMINAL, TOOL_ID_DEVELOPER_REVIEW]);
export const toolEffectSchema = z.enum(["read", "write", "destructive", "unknown"]);
export const toolActivityStatusSchema = z.enum(["permission_required", "denied", "running", "completed", "failed"]);

export const skillAllowedToolSchema = z.object({ toolId: z.literal(TOOL_ID_PROJECT_FILESYSTEM_READ), operation: z.literal("read") }).strict();
export type SkillAllowedTool = z.infer<typeof skillAllowedToolSchema>;
