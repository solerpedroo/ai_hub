import { z } from "zod";
import {
  appearanceSettingsSchema,
  contextPacketDtoSchema,
  conversationDtoSchema,
  messageDtoSchema,
  projectDtoSchema,
  skillDtoSchema,
} from "./ipc-schemas";

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

const syncProjectSchema = projectDtoSchema.extend({
  name: z.string().max(200),
  instructions: z.string().max(40_000).nullable(),
}).strict();

const syncConversationSchema = conversationDtoSchema.extend({
  packetAppliedAt: z.string().datetime().nullable(),
  kind: z.literal("chat"),
}).strict();

const syncMessageSchema = messageDtoSchema.extend({
  content: z.string().max(100_000),
  updatedAt: z.string().datetime(),
}).strict();

const syncPacketSchema = contextPacketDtoSchema.extend({
  payloadJson: z.string().max(2_000_000),
  version: z.number().int().positive(),
}).strict();

/**
 * Encrypted relay files are still untrusted input: validate before they reach
 * repository writes. Provider credentials are intentionally absent.
 */
export const syncSnapshotSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string().datetime(),
  projects: z.array(syncProjectSchema).max(10_000),
  conversations: z.array(syncConversationSchema).max(50_000),
  messages: z.array(syncMessageSchema).max(250_000),
  appearance: appearanceSettingsSchema.optional(),
  packets: z.array(syncPacketSchema).max(10_000),
  skills: z.array(skillDtoSchema).max(10_000),
}).strict();
