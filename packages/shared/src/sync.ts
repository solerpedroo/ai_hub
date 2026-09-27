import { z } from "zod";

export const SYNC_CATEGORIES = ["projects", "conversations", "settings", "packets", "skills"] as const;
export const syncCategorySchema = z.enum(SYNC_CATEGORIES);
export type SyncCategory = z.infer<typeof syncCategorySchema>;

export const syncCategoriesSchema = z.object({
  projects: z.boolean(),
  conversations: z.boolean(),
  settings: z.boolean(),
  packets: z.boolean(),
  skills: z.boolean(),
}).strict();
export type SyncCategories = z.infer<typeof syncCategoriesSchema>;

export const syncConfigDtoSchema = z.object({
  enabled: z.boolean(), relayConfigured: z.boolean(), phraseConfigured: z.boolean(), categories: syncCategoriesSchema,
  lastSyncAt: z.string().datetime().nullable(), conflictCount: z.number().int().nonnegative(),
}).strict();
export type SyncConfigDto = z.infer<typeof syncConfigDtoSchema>;

export const syncConfigureInputSchema = z.object({ enabled: z.boolean(), categories: syncCategoriesSchema, pairingPhrase: z.string().min(16).max(256).optional() }).strict();
export type SyncConfigureInput = z.infer<typeof syncConfigureInputSchema>;

export const syncPickRelayResultSchema = z.object({ status: z.enum(["selected", "cancelled"]), relayConfigured: z.boolean() }).strict();
export type SyncPickRelayResult = z.infer<typeof syncPickRelayResultSchema>;

export const syncRunResultSchema = z.object({ status: z.enum(["synced", "not_configured", "disabled"]), imported: z.number().int().nonnegative(), exported: z.number().int().nonnegative(), conflicts: z.number().int().nonnegative(), syncedAt: z.string().datetime().nullable() }).strict();
export type SyncRunResult = z.infer<typeof syncRunResultSchema>;
