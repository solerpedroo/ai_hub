import { z } from "zod";
import { localeSchema, themeModeSchema } from "./appearance";
import { gatewayErrorCodeSchema, packetV0Schema, receiptDtoSchema } from "./gateway";

export const emptyIpcPayloadSchema = z.object({}).strict();

export type EmptyIpcPayload = z.infer<typeof emptyIpcPayloadSchema>;

export const windowIsMaximizedResultSchema = z.boolean();

export const ipcAckResultSchema = z.union([z.void(), z.undefined(), z.null()]);

export const isoTimestampSchema = z.string().min(1);

export const projectDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export type ProjectDto = z.infer<typeof projectDtoSchema>;

export const projectListResultSchema = z.array(projectDtoSchema);

export const projectCreateInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
  })
  .strict();

export type ProjectCreateInput = z.infer<typeof projectCreateInputSchema>;

export const idInputSchema = z.object({ id: z.string().uuid() }).strict();

export type IdInput = z.infer<typeof idInputSchema>;

export const conversationDtoSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  title: z.string(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export type ConversationDto = z.infer<typeof conversationDtoSchema>;

export const conversationListResultSchema = z.array(conversationDtoSchema);

export const conversationListInputSchema = z
  .object({
    projectId: z.string().uuid().nullable(),
  })
  .strict();

export type ConversationListInput = z.infer<typeof conversationListInputSchema>;

export const conversationCreateInputSchema = z
  .object({
    projectId: z.string().uuid().nullable(),
    title: z.string().trim().min(1).max(200),
  })
  .strict();

export type ConversationCreateInput = z.infer<typeof conversationCreateInputSchema>;

export const messageRoleSchema = z.enum(["user", "assistant", "system"]);

export type MessageRole = z.infer<typeof messageRoleSchema>;

export const messageStatusSchema = z.enum(["complete", "streaming", "interrupted", "aborted"]);

export type MessageStatus = z.infer<typeof messageStatusSchema>;

export const messageDtoSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  branchId: z.string().uuid(),
  role: messageRoleSchema,
  content: z.string(),
  status: messageStatusSchema,
  createdAt: isoTimestampSchema,
  receipt: receiptDtoSchema.nullable(),
});

export type MessageDto = z.infer<typeof messageDtoSchema>;

export const messageListResultSchema = z.array(messageDtoSchema);

export const messageListInputSchema = z
  .object({
    conversationId: z.string().uuid(),
  })
  .strict();

export type MessageListInput = z.infer<typeof messageListInputSchema>;

export const messageCreateInputSchema = z
  .object({
    conversationId: z.string().uuid(),
    role: messageRoleSchema,
    content: z.string().min(1).max(100_000),
    parentId: z.string().uuid().nullable(),
    branchId: z.string().uuid().nullable(),
  })
  .strict();

export type MessageCreateInput = z.infer<typeof messageCreateInputSchema>;

export const appearanceSettingsSchema = z
  .object({
    theme: z.enum(themeModeSchema),
    locale: z.enum(localeSchema),
  })
  .strict();

export type AppearanceSettings = z.infer<typeof appearanceSettingsSchema>;

export const providerDtoSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
});

export type ProviderDto = z.infer<typeof providerDtoSchema>;

export const providerListResultSchema = z.array(providerDtoSchema);

export const maskedKeySchema = z
  .string()
  .min(3)
  .max(32)
  .refine((value) => value.includes("…"), { message: "masked key required" });

export const providerKeyDtoSchema = z.object({
  id: z.string().uuid(),
  providerSlug: z.string(),
  label: z.string(),
  maskedKey: maskedKeySchema,
  last4: z.string().min(1).max(8),
  status: z.enum(["active", "invalid"]),
  createdAt: isoTimestampSchema,
});

export type ProviderKeyDto = z.infer<typeof providerKeyDtoSchema>;

export const providerKeyListResultSchema = z.array(providerKeyDtoSchema);

export const secretsSaveInputSchema = z
  .object({
    providerSlug: z.string().min(1).max(64),
    label: z.string().trim().min(1).max(80),
    secret: z.string().min(8).max(4096),
  })
  .strict();

export type SecretsSaveInput = z.infer<typeof secretsSaveInputSchema>;

export const chatEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("chunk"),
    runId: z.string().uuid(),
    messageId: z.string().uuid(),
    text: z.string(),
  }),
  z.object({
    type: z.literal("done"),
    runId: z.string().uuid(),
    message: messageDtoSchema,
    packet: packetV0Schema,
  }),
  z.object({
    type: z.literal("error"),
    runId: z.string().uuid(),
    messageId: z.string().uuid(),
    code: gatewayErrorCodeSchema,
  }),
]);

export type ChatEvent = z.infer<typeof chatEventSchema>;
