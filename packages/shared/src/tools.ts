import { z } from "zod";

export const TOOL_ID_PROJECT_FILESYSTEM_READ = "project-filesystem.read-file" as const;
export const toolIdSchema = z.literal(TOOL_ID_PROJECT_FILESYSTEM_READ);
export const toolEffectSchema = z.enum(["read", "write", "destructive", "unknown"]);
export const toolActivityStatusSchema = z.enum(["permission_required", "denied", "running", "completed", "failed"]);

export const skillAllowedToolSchema = z.object({ toolId: toolIdSchema, operation: z.literal("read") }).strict();
export type SkillAllowedTool = z.infer<typeof skillAllowedToolSchema>;
