import { z } from "zod";

export const EXTENSION_API_VERSION = 1 as const;
export const extensionPermissionSchema = z.object({
  toolId: z.string().regex(/^[a-z][a-z0-9.-]+$/).max(128),
  operation: z.literal("read"),
  effect: z.literal("read"),
}).strict();

export const extensionManifestSchema = z.object({
  apiVersion: z.literal(EXTENSION_API_VERSION),
  id: z.string().regex(/^[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+$/).max(128),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  kind: z.enum(["provider", "mcp", "skill"]),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(400),
  permissions: z.array(extensionPermissionSchema).max(16),
  sandbox: z.literal("core"),
}).strict();

export type ExtensionManifest = z.infer<typeof extensionManifestSchema>;
