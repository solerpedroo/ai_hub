import { z } from "zod";
import { localeSchema, themeModeSchema } from "./appearance";
import { gatewayErrorCodeSchema, packetV0Schema, receiptDtoSchema } from "./gateway";

export const spendCapScopeSchema = z.enum(["request", "day", "global"]);

export const emptyIpcPayloadSchema = z.object({}).strict();

export type EmptyIpcPayload = z.infer<typeof emptyIpcPayloadSchema>;

export const windowIsMaximizedResultSchema = z.boolean();

export const ipcAckResultSchema = z.union([z.void(), z.undefined(), z.null()]);

export const isoTimestampSchema = z.string().min(1);

const CREDENTIAL_QUERY_KEYS = new Set(["api_key", "apikey", "key", "token", "secret", "access_token"]);

export const customBaseUrlSchema = z
  .string()
  .url()
  .max(512)
  .superRefine((value, ctx) => {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid URL" });
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only http(s) URLs are allowed" });
    }
    if (parsed.username !== "" || parsed.password !== "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Credentials in URLs are not allowed" });
    }
    for (const name of parsed.searchParams.keys()) {
      if (CREDENTIAL_QUERY_KEYS.has(name.toLowerCase())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Credential query parameters are not allowed" });
        break;
      }
    }
  });

export const projectColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .nullable();

export const projectDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: projectColorSchema,
  instructions: z.string().nullable(),
  preferredModel: z.string().max(128).nullable(),
  preferredProvider: z.string().max(64).nullable(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export type ProjectDto = z.infer<typeof projectDtoSchema>;

export const projectListResultSchema = z.array(projectDtoSchema);

const projectFieldsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  color: projectColorSchema.optional(),
  instructions: z.string().max(20_000).nullable().optional(),
  preferredModel: z.string().trim().min(1).max(128).nullable().optional(),
  preferredProvider: z.string().trim().min(1).max(64).nullable().optional(),
});

export const projectCreateInputSchema = projectFieldsSchema.strict();

export type ProjectCreateInput = z.infer<typeof projectCreateInputSchema>;

export const projectUpdateInputSchema = projectFieldsSchema
  .extend({
    id: z.string().uuid(),
  })
  .strict();

export type ProjectUpdateInput = z.infer<typeof projectUpdateInputSchema>;

export const idInputSchema = z.object({ id: z.string().uuid() }).strict();

export type IdInput = z.infer<typeof idInputSchema>;

export const tagNameSchema = z.string().trim().min(1).max(40);

export const conversationDtoSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  title: z.string(),
  tags: z.array(tagNameSchema),
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

export const conversationTagsSetInputSchema = z
  .object({
    conversationId: z.string().uuid(),
    names: z.array(tagNameSchema).max(20),
  })
  .strict();

export type ConversationTagsSetInput = z.infer<typeof conversationTagsSetInputSchema>;

export const searchInputSchema = z
  .object({
    query: z.string().trim().min(1).max(200),
  })
  .strict();

export type SearchInput = z.infer<typeof searchInputSchema>;

export const searchHitSchema = z
  .object({
    conversationId: z.string().uuid(),
    projectId: z.string().uuid().nullable(),
    conversationTitle: z.string().max(200),
    messageId: z.string().uuid().nullable(),
    snippet: z.string().max(400),
  })
  .strict();

export type SearchHit = z.infer<typeof searchHitSchema>;

export const searchResultSchema = z.array(searchHitSchema).max(50);

export const packetPreviewInputSchema = z
  .object({
    conversationId: z.string().uuid(),
    extraSystem: z.string().max(20_000).optional(),
    model: z.string().min(1).max(128),
    providerSlug: z.string().min(1).max(64),
    compact: z.boolean().optional(),
    pendingContent: z.string().max(100_000).optional(),
    maxTokens: z.number().int().min(1).max(128_000).nullable().optional(),
  })
  .strict();

export type PacketPreviewInput = z.infer<typeof packetPreviewInputSchema>;

export const packetPreviewResultSchema = z
  .object({
    tokenEstimate: z.number().int().nonnegative(),
    contextWindow: z.number().int().positive(),
    overflow: z.boolean(),
    compacted: z.boolean(),
    excludedCount: z.number().int().nonnegative(),
    estimatedCostUsd: z.string().nullable(),
    capWarnings: z.array(spendCapScopeSchema),
    capBlocked: spendCapScopeSchema.nullable(),
  })
  .strict();

export type PacketPreviewResult = z.infer<typeof packetPreviewResultSchema>;

export const messageRoleSchema = z.enum(["user", "assistant", "system"]);

export type MessageRole = z.infer<typeof messageRoleSchema>;

export const messageStatusSchema = z.enum(["complete", "streaming", "interrupted", "aborted"]);

export type MessageStatus = z.infer<typeof messageStatusSchema>;

export const messageDtoSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  branchId: z.string().uuid(),
  isActiveBranch: z.boolean(),
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

export const messageUpdateInputSchema = z
  .object({
    id: z.string().uuid(),
    content: z.string().min(1).max(100_000),
  })
  .strict();

export type MessageUpdateInput = z.infer<typeof messageUpdateInputSchema>;

export const workspaceSessionSchema = z
  .object({
    projectId: z.string().uuid().nullable(),
    conversationId: z.string().uuid().nullable(),
    model: z.string().min(1).max(128),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(1).max(128_000).nullable().optional(),
    extraSystem: z.string().max(20_000).optional(),
  })
  .strict();

export type WorkspaceSession = z.infer<typeof workspaceSessionSchema>;

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
  endpointUrl: z.string().max(512).nullable(),
  createdAt: isoTimestampSchema,
});

export type ProviderKeyDto = z.infer<typeof providerKeyDtoSchema>;

export const providerKeyListResultSchema = z.array(providerKeyDtoSchema);

export const secretsSaveInputSchema = z
  .object({
    providerSlug: z.string().min(1).max(64),
    label: z.string().trim().min(1).max(80),
    secret: z.string().min(8).max(4096),
    baseUrl: customBaseUrlSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.providerSlug === "custom") {
      if (value.baseUrl === undefined || value.baseUrl.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Custom providers require a base URL",
          path: ["baseUrl"],
        });
      }
      return;
    }
    if (value.baseUrl !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "baseUrl is only valid for custom providers",
        path: ["baseUrl"],
      });
    }
  });

export type SecretsSaveInput = z.infer<typeof secretsSaveInputSchema>;

export const secretsTestInputSchema = idInputSchema;

export type SecretsTestInput = z.infer<typeof secretsTestInputSchema>;

export const secretsTestResultSchema = z
  .object({
    ok: z.boolean(),
    latencyMs: z.number().int().nonnegative(),
    errorCode: gatewayErrorCodeSchema.nullable(),
  })
  .strict();

export type SecretsTestResult = z.infer<typeof secretsTestResultSchema>;

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
    suggestProviderSlug: z.string().min(1).max(64).nullable(),
    suggestKeyId: z.string().uuid().nullable(),
    suggestModel: z.string().min(1).max(128).nullable(),
  }),
]);

export type ChatEvent = z.infer<typeof chatEventSchema>;

export const chatSendResultSchema = z
  .object({
    runId: z.string().uuid(),
    messageId: z.string().uuid(),
    userMessageId: z.string().uuid().nullable(),
    packet: packetV0Schema,
    userMessage: messageDtoSchema.nullable(),
    assistant: messageDtoSchema,
  })
  .strict();

export type ChatSendResult = z.infer<typeof chatSendResultSchema>;

export const branchLabelsSchema = z.record(z.string().uuid(), z.string().trim().min(1).max(80));

export type BranchLabels = z.infer<typeof branchLabelsSchema>;

export const branchLabelsGetInputSchema = z
  .object({
    conversationId: z.string().uuid(),
  })
  .strict();

export type BranchLabelsGetInput = z.infer<typeof branchLabelsGetInputSchema>;

export const branchLabelSetInputSchema = z
  .object({
    conversationId: z.string().uuid(),
    branchId: z.string().uuid(),
    label: z.string().max(80),
  })
  .strict();

export type BranchLabelSetInput = z.infer<typeof branchLabelSetInputSchema>;

export const conversationExportModeSchema = z.enum(["active", "tree"]);

export type ConversationExportMode = z.infer<typeof conversationExportModeSchema>;

export const conversationExportInputSchema = z
  .object({
    conversationId: z.string().uuid(),
    mode: conversationExportModeSchema,
  })
  .strict();

export type ConversationExportInput = z.infer<typeof conversationExportInputSchema>;

export const conversationExportResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("saved"), path: z.string().min(1) }).strict(),
  z.object({ status: z.literal("cancelled") }).strict(),
]);

export type ConversationExportResult = z.infer<typeof conversationExportResultSchema>;

export const conversationExportDocumentSchema = z
  .object({
    version: z.literal(1),
    mode: conversationExportModeSchema,
    exportedAt: isoTimestampSchema,
    conversation: conversationDtoSchema,
    branchLabels: branchLabelsSchema,
    messages: z.array(messageDtoSchema),
  })
  .strict();

export type ConversationExportDocument = z.infer<typeof conversationExportDocumentSchema>;

export type SpendCapScopeDto = z.infer<typeof spendCapScopeSchema>;

export const usdAmountSchema = z.string().regex(/^\d+(\.\d{1,6})?$/).max(20);

export const spendCapDtoSchema = z
  .object({
    scope: spendCapScopeSchema,
    limitUsd: usdAmountSchema.nullable(),
  })
  .strict();

export type SpendCapDto = z.infer<typeof spendCapDtoSchema>;

export const spendCapListResultSchema = z.array(spendCapDtoSchema).max(3);

export const spendCapSetInputSchema = z
  .object({
    caps: z.array(spendCapDtoSchema).max(3),
  })
  .strict();

export type SpendCapSetInput = z.infer<typeof spendCapSetInputSchema>;

export const healthSummarySchema = z
  .object({
    providerSlug: z.string().min(1).max(64),
    lastOk: z.boolean().nullable(),
    lastLatencyMs: z.number().int().nullable(),
    errorRate: z.number().min(0).max(1),
    sampleCount: z.number().int().nonnegative(),
  })
  .strict();

export type HealthSummaryDto = z.infer<typeof healthSummarySchema>;

export const healthSummaryListSchema = z.array(healthSummarySchema).max(32);

export const costsAggregateInputSchema = z
  .object({
    conversationId: z.string().uuid().nullable(),
    projectId: z.string().uuid().nullable(),
  })
  .strict();

export type CostsAggregateInput = z.infer<typeof costsAggregateInputSchema>;

export const costsAggregateResultSchema = z
  .object({
    conversationUsd: z.string().nullable(),
    projectUsd: z.string().nullable(),
    dayUsd: z.string(),
    globalUsd: z.string(),
  })
  .strict();

export type CostsAggregateResult = z.infer<typeof costsAggregateResultSchema>;

export const debugSnapshotSchema = z
  .object({
    at: isoTimestampSchema,
    provider: z.string().min(1).max(64),
    model: z.string().min(1).max(128),
    retries: z.number().int().nonnegative(),
    lastErrorCode: gatewayErrorCodeSchema.nullable(),
    tokenEstimate: z.number().int().nonnegative(),
    estimatedCostUsd: z.string().nullable(),
    capDecision: z.enum(["ok", "warn", "block", "override"]),
    capScope: spendCapScopeSchema.nullable(),
    overflow: z.boolean(),
  })
  .strict();

export type DebugSnapshot = z.infer<typeof debugSnapshotSchema>;

export const debugSnapshotResultSchema = debugSnapshotSchema.nullable();

export const updateCheckStatusSchema = z.enum(["idle", "skipped", "uptodate", "available", "unavailable"]);

export type UpdateCheckStatus = z.infer<typeof updateCheckStatusSchema>;

export const appPrefsSchema = z
  .object({
    onboardingComplete: z.boolean(),
    crashReporterOptIn: z.boolean(),
    lastUpdateCheckAt: isoTimestampSchema.nullable(),
    lastUpdateStatus: updateCheckStatusSchema,
    lastWizardTtftMs: z.number().int().nonnegative().nullable(),
  })
  .strict();

export type AppPrefs = z.infer<typeof appPrefsSchema>;

export const appPrefsPatchSchema = appPrefsSchema.partial().strict();

export type AppPrefsPatch = z.infer<typeof appPrefsPatchSchema>;

export const updateCheckResultSchema = z
  .object({
    status: updateCheckStatusSchema,
    version: z.string().max(64).nullable(),
  })
  .strict();

export type UpdateCheckResult = z.infer<typeof updateCheckResultSchema>;
