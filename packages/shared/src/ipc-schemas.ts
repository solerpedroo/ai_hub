import { z } from "zod";
import { localeSchema, themeModeSchema } from "./appearance";
import { effortLevelSchema, runModeSchema } from "./run-modes";
import {
  gatewayErrorCodeSchema,
  mentionRefListSchema,
  mentionTypeSchema,
  packetV0Schema,
  receiptDtoSchema,
} from "./gateway";
import {
  packetPrivacyModeSchema,
  packetSliceSchema,
  portablePacketOriginSchema,
} from "./portable-packet";
import { skillAllowedToolSchema, toolActivityStatusSchema, toolEffectSchema, toolIdSchema } from "./tools";

export const spendCapScopeSchema = z.enum(["request", "day", "global"]);
export const capBlockScopeSchema = z.enum(["request", "day", "global", "project", "provider"]);

export const emptyIpcPayloadSchema = z.object({}).strict();

export type EmptyIpcPayload = z.infer<typeof emptyIpcPayloadSchema>;

export const windowIsMaximizedResultSchema = z.boolean();
export const clipboardTextSchema = z.string().max(100_000);

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

export const toolProjectStateSchema = z.object({
  projectId: z.string().uuid(),
  rootLabel: z.string().min(1).max(260).nullable(),
  allowedTools: z.array(toolIdSchema).max(16),
}).strict();
export type ToolProjectState = z.infer<typeof toolProjectStateSchema>;

export const toolProjectGetInputSchema = z.object({ projectId: z.string().uuid() }).strict();
export type ToolProjectGetInput = z.infer<typeof toolProjectGetInputSchema>;

export const toolProjectRootPickResultSchema = z.discriminatedUnion("status", [
  toolProjectStateSchema.extend({ status: z.literal("selected") }).strict(),
  z.object({ status: z.literal("cancelled") }).strict(),
]);
export type ToolProjectRootPickResult = z.infer<typeof toolProjectRootPickResultSchema>;

export const toolReadRequestInputSchema = z.object({
  projectId: z.string().uuid(),
  relativePath: z.string().min(1).max(1024),
}).strict();
export type ToolReadRequestInput = z.infer<typeof toolReadRequestInputSchema>;

export const toolActivityDtoSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  toolId: toolIdSchema,
  operation: z.literal("read"),
  effect: toolEffectSchema,
  status: toolActivityStatusSchema,
  argsSummary: z.string().max(200),
  resultSummary: z.string().max(260).nullable(),
  createdAt: isoTimestampSchema,
}).strict();
export type ToolActivityDto = z.infer<typeof toolActivityDtoSchema>;

export const toolReadRequestResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("denied"), activity: toolActivityDtoSchema }).strict(),
  z.object({ kind: z.literal("completed"), activity: toolActivityDtoSchema, content: z.string().max(16_000) }).strict(),
]);
export type ToolReadRequestResult = z.infer<typeof toolReadRequestResultSchema>;
export const toolActivityResultSchema = toolActivityDtoSchema.nullable();

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

export const importSourceSchema = z.enum(["chatgpt", "claude", "gemini"]);

export type ImportSourceDto = z.infer<typeof importSourceSchema>;

export const conversationDtoSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  title: z.string(),
  tags: z.array(tagNameSchema),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  importSource: importSourceSchema.nullable(),
  activePacketId: z.string().uuid().nullable(),
  runMode: runModeSchema,
  effortLevel: effortLevelSchema,
});

export type ConversationDto = z.infer<typeof conversationDtoSchema>;

export const conversationListResultSchema = z.array(conversationDtoSchema);

export const conversationListInputSchema = z
  .object({
    projectId: z.string().uuid().nullable(),
    inbox: z.enum(["avulsas", "imported"]).optional(),
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
export const conversationRunSettingsSchema = z.object({ conversationId: z.string().uuid(), runMode: runModeSchema, effortLevel: effortLevelSchema }).strict();
export type ConversationRunSettings = z.infer<typeof conversationRunSettingsSchema>;

export const conversationMoveInputSchema = z
  .object({
    conversationId: z.string().uuid(),
    projectId: z.string().uuid().nullable(),
  })
  .strict();

export type ConversationMoveInput = z.infer<typeof conversationMoveInputSchema>;

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
    privacyMode: packetPrivacyModeSchema.optional(),
    fileIds: z.array(z.string().uuid()).max(8).optional(),
    mentions: mentionRefListSchema.optional(),
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
    capWarnings: z.array(capBlockScopeSchema),
    capBlocked: capBlockScopeSchema.nullable(),
    included: z.array(packetSliceSchema).max(200),
    omitted: z.array(packetSliceSchema).max(200),
    destinationModel: z.string().min(1).max(128),
    destinationProvider: z.string().min(1).max(64),
    privacyMode: packetPrivacyModeSchema,
    appliedPacketId: z.string().uuid().nullable(),
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
  pinned: z.boolean(),
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
    importedInbox: z.boolean().optional(),
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
  z.object({ type: z.literal("usage"), runId: z.string().uuid(), messageId: z.string().uuid(), tokensIn: z.number().int().nonnegative(), tokensOut: z.number().int().nonnegative(), tokensThinking: z.number().int().nonnegative().default(0), cacheReadTokens: z.number().int().nonnegative().default(0), cacheWriteTokens: z.number().int().nonnegative().default(0), costUsd: z.string().nullable(), thinkingSupported: z.boolean() }),
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

export const scopedSpendCapDtoSchema = z.object({
  dimension: z.enum(["project", "provider"]),
  subjectId: z.string().min(1).max(128),
  limitUsd: usdAmountSchema.nullable(),
}).strict();
export type ScopedSpendCapDto = z.infer<typeof scopedSpendCapDtoSchema>;
export const scopedSpendCapListResultSchema = z.array(scopedSpendCapDtoSchema).max(256);
export const scopedSpendCapSetInputSchema = z.object({ caps: scopedSpendCapListResultSchema }).strict();
export type ScopedSpendCapSetInput = z.infer<typeof scopedSpendCapSetInputSchema>;

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

export const monthlyCostsInputSchema = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }).strict();
export type MonthlyCostsInput = z.infer<typeof monthlyCostsInputSchema>;
const costBreakdownSchema = z.object({ key: z.string().min(1).max(256), tokens: z.number().int().nonnegative(), requests: z.number().int().nonnegative(), costUsd: z.string() }).strict();
export const monthlyCostsResultSchema = z.object({ month: z.string(), tokens: z.number().int().nonnegative(), requests: z.number().int().nonnegative(), costUsd: z.string(), byModel: z.array(costBreakdownSchema), byProject: z.array(costBreakdownSchema) }).strict();
export type MonthlyCostsResult = z.infer<typeof monthlyCostsResultSchema>;

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
    capScope: capBlockScopeSchema.nullable(),
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
    privacyMode: z.enum(["private", "normal", "maximum"]),
    firewallPolicy: z
      .object({
        secret: z.enum(["block", "mask", "allow"]),
        token: z.enum(["block", "mask", "allow"]),
        email: z.enum(["block", "mask", "allow"]),
        cpf: z.enum(["block", "mask", "allow"]),
        prompt_injection: z.enum(["block", "mask", "allow"]),
      })
      .strict(),
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

export const importJobStatusSchema = z.enum(["queued", "running", "complete", "cancelled", "failed"]);

export type ImportJobStatus = z.infer<typeof importJobStatusSchema>;

export const importPickResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("picked"),
      ticket: z.string().uuid(),
      fileName: z.string().min(1).max(260),
    })
    .strict(),
  z.object({ status: z.literal("cancelled") }).strict(),
]);

export type ImportPickResult = z.infer<typeof importPickResultSchema>;

export const importStartInputSchema = z
  .object({
    ticket: z.string().uuid(),
    source: importSourceSchema,
    projectId: z.string().uuid().nullable(),
  })
  .strict();

export type ImportStartInput = z.infer<typeof importStartInputSchema>;

export const importStartResultSchema = z
  .object({
    jobId: z.string().uuid(),
  })
  .strict();

export type ImportStartResult = z.infer<typeof importStartResultSchema>;

export const importCancelInputSchema = z.object({ jobId: z.string().uuid() }).strict();

export type ImportCancelInput = z.infer<typeof importCancelInputSchema>;

export const importItemErrorSchema = z
  .object({
    reason: z.enum(["empty", "failed"]),
  })
  .strict();

export type ImportItemError = z.infer<typeof importItemErrorSchema>;

export const importReportSchema = z
  .object({
    ok: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    errors: z.array(importItemErrorSchema).max(200),
    attachmentsSkipped: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  })
  .strict();

export type ImportReport = z.infer<typeof importReportSchema>;

export const importEventSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("progress"),
      jobId: z.string().uuid(),
      processed: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
      ok: z.number().int().nonnegative(),
      skipped: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      type: z.literal("done"),
      jobId: z.string().uuid(),
      status: z.enum(["complete", "cancelled", "failed"]),
      report: importReportSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("error"),
      jobId: z.string().uuid().nullable(),
      code: z.enum(["invalid_json", "unrecognized", "gemini_html", "empty", "generic"]),
    })
    .strict(),
]);

export type ImportEvent = z.infer<typeof importEventSchema>;

export const importJobDtoSchema = z
  .object({
    id: z.string().uuid(),
    source: importSourceSchema,
    status: importJobStatusSchema,
    report: importReportSchema.nullable(),
    createdAt: isoTimestampSchema,
  })
  .strict();

export type ImportJobDto = z.infer<typeof importJobDtoSchema>;

export const contextPacketDtoSchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().uuid().nullable(),
    tokenEstimate: z.number().int().nonnegative().nullable(),
    privacyMode: packetPrivacyModeSchema,
    origin: portablePacketOriginSchema,
    createdAt: isoTimestampSchema,
  })
  .strict();

export type ContextPacketDto = z.infer<typeof contextPacketDtoSchema>;

export const contextPacketListResultSchema = z.array(contextPacketDtoSchema);

export const packetsListInputSchema = z
  .object({
    projectId: z.string().uuid().nullable(),
  })
  .strict();

export type PacketsListInput = z.infer<typeof packetsListInputSchema>;

export const packetsCompileInputSchema = z
  .object({
    conversationId: z.string().uuid(),
    extraSystem: z.string().max(20_000).optional(),
    compact: z.boolean().optional(),
    privacyMode: packetPrivacyModeSchema.optional(),
    model: z.string().min(1).max(128).optional(),
    providerSlug: z.string().min(1).max(64).optional(),
  })
  .strict();

export type PacketsCompileInput = z.infer<typeof packetsCompileInputSchema>;

export const packetsExportInputSchema = z
  .object({
    packetId: z.string().uuid(),
  })
  .strict();

export type PacketsExportInput = z.infer<typeof packetsExportInputSchema>;

export const packetsExportResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("saved") }).strict(),
  z.object({ status: z.literal("cancelled") }).strict(),
]);

export type PacketsExportResult = z.infer<typeof packetsExportResultSchema>;

export const packetsImportInputSchema = z
  .object({
    ticket: z.string().uuid(),
    projectId: z.string().uuid(),
  })
  .strict();

export type PacketsImportInput = z.infer<typeof packetsImportInputSchema>;

export const packetsApplyInputSchema = z
  .object({
    conversationId: z.string().uuid(),
    packetId: z.string().uuid(),
  })
  .strict();

export type PacketsApplyInput = z.infer<typeof packetsApplyInputSchema>;

export const packetsClearInputSchema = z
  .object({
    conversationId: z.string().uuid(),
  })
  .strict();

export type PacketsClearInput = z.infer<typeof packetsClearInputSchema>;

export const messagePinInputSchema = z
  .object({
    id: z.string().uuid(),
    pinned: z.boolean(),
  })
  .strict();

export type MessagePinInput = z.infer<typeof messagePinInputSchema>;

export const projectFileKindSchema = z.enum([
  "pdf",
  "docx",
  "text",
  "code",
  "csv",
  "image",
  "folder-summary",
]);

export type ProjectFileKind = z.infer<typeof projectFileKindSchema>;

export const projectFileDtoSchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().uuid().nullable(),
    name: z.string().min(1).max(260),
    kind: projectFileKindSchema,
    mime: z.string().min(1).max(128),
    byteSize: z.number().int().nonnegative(),
    tokenEstimate: z.number().int().nonnegative(),
    excerpt: z.string().max(400),
    truncated: z.boolean(),
    visionRequired: z.boolean(),
    createdAt: isoTimestampSchema,
  })
  .strict();

export type ProjectFileDto = z.infer<typeof projectFileDtoSchema>;

export const projectFileListInputSchema = z
  .object({
    projectId: z.string().uuid().nullable(),
  })
  .strict();

export type ProjectFileListInput = z.infer<typeof projectFileListInputSchema>;

export const projectFileListResultSchema = z.array(projectFileDtoSchema).max(100);

export const filesIngestPathsInputSchema = z
  .object({
    projectId: z.string().uuid().nullable(),
    items: z
      .array(
        z
          .object({
            path: z.string().min(1).max(1024),
            name: z.string().min(1).max(260),
          })
          .strict(),
      )
      .min(1)
      .max(8),
  })
  .strict();

export type FilesIngestPathsInput = z.infer<typeof filesIngestPathsInputSchema>;

export const filesAttachKindSchema = z.enum(["file", "folder"]);

export const filesAttachInputSchema = z
  .object({
    projectId: z.string().uuid().nullable(),
    kind: filesAttachKindSchema,
  })
  .strict();

export type FilesAttachInput = z.infer<typeof filesAttachInputSchema>;

export const filesRemoveInputSchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().uuid().nullable(),
  })
  .strict();

export type FilesRemoveInput = z.infer<typeof filesRemoveInputSchema>;

export const memorySourceSchema = z.enum(["manual", "suggested"]);

export const projectMemoryDtoSchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(4000),
    source: memorySourceSchema,
    createdAt: isoTimestampSchema,
    updatedAt: isoTimestampSchema,
  })
  .strict();

export type ProjectMemoryDto = z.infer<typeof projectMemoryDtoSchema>;

export const memoryListInputSchema = z
  .object({
    projectId: z.string().uuid(),
  })
  .strict();

export type MemoryListInput = z.infer<typeof memoryListInputSchema>;

export const memoryListResultSchema = z.array(projectMemoryDtoSchema).max(100);

export const memoryCreateInputSchema = z
  .object({
    projectId: z.string().uuid(),
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(4000),
    source: memorySourceSchema.optional(),
  })
  .strict();

export type MemoryCreateInput = z.infer<typeof memoryCreateInputSchema>;

export const memoryUpdateInputSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).max(120).optional(),
    body: z.string().min(1).max(4000).optional(),
  })
  .strict();

export type MemoryUpdateInput = z.infer<typeof memoryUpdateInputSchema>;

export const memorySuggestInputSchema = z
  .object({
    projectId: z.string().uuid(),
    text: z.string().min(1).max(16_000),
  })
  .strict();

export type MemorySuggestInput = z.infer<typeof memorySuggestInputSchema>;

export const memorySuggestResultSchema = z
  .object({
    suggestions: z.array(z.string().min(1).max(240)).max(4),
    optedOut: z.boolean(),
  })
  .strict();

export type MemorySuggestResult = z.infer<typeof memorySuggestResultSchema>;

export const memoryOptOutInputSchema = z
  .object({
    projectId: z.string().uuid(),
  })
  .strict();

export type MemoryOptOutInput = z.infer<typeof memoryOptOutInputSchema>;

export const memoryOptOutStateSchema = z
  .object({
    optedOut: z.boolean(),
  })
  .strict();

export type MemoryOptOutState = z.infer<typeof memoryOptOutStateSchema>;

export const memorySetOptOutInputSchema = z
  .object({
    projectId: z.string().uuid(),
    optedOut: z.boolean(),
  })
  .strict();

export type MemorySetOptOutInput = z.infer<typeof memorySetOptOutInputSchema>;

export const conversationTaskDtoSchema = z
  .object({
    id: z.string().uuid(),
    conversationId: z.string().uuid(),
    title: z.string().min(1).max(240),
    done: z.boolean(),
    createdAt: isoTimestampSchema,
  })
  .strict();

export type ConversationTaskDto = z.infer<typeof conversationTaskDtoSchema>;

export const conversationWorkspaceDtoSchema = z
  .object({
    conversationId: z.string().uuid(),
    summary: z.string().max(4000),
    decisions: z.array(z.string().max(180)).max(20),
    tasks: z.array(conversationTaskDtoSchema).max(50),
    pins: z.array(z.string().uuid()).max(50),
  })
  .strict();

export type ConversationWorkspaceDto = z.infer<typeof conversationWorkspaceDtoSchema>;

export const workspaceConversationInputSchema = z
  .object({
    conversationId: z.string().uuid(),
  })
  .strict();

export type WorkspaceConversationInput = z.infer<typeof workspaceConversationInputSchema>;

export const workspaceAddTaskInputSchema = z
  .object({
    conversationId: z.string().uuid(),
    title: z.string().min(1).max(240),
  })
  .strict();

export type WorkspaceAddTaskInput = z.infer<typeof workspaceAddTaskInputSchema>;

export const workspaceSetTaskDoneInputSchema = z
  .object({
    id: z.string().uuid(),
    done: z.boolean(),
  })
  .strict();

export type WorkspaceSetTaskDoneInput = z.infer<typeof workspaceSetTaskDoneInputSchema>;

export const conversationToProjectResultSchema = z
  .object({
    project: projectDtoSchema,
    conversation: conversationDtoSchema,
  })
  .strict();

export type ConversationToProjectResult = z.infer<typeof conversationToProjectResultSchema>;

export const promptFolderSchema = z.enum(["development", "studies", "work"]);

export type PromptFolderDto = z.infer<typeof promptFolderSchema>;

export const promptDtoSchema = z
  .object({
    id: z.string().uuid(),
    folder: promptFolderSchema,
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(16_000),
    factoryId: z.string().min(1).max(40).nullable(),
    createdAt: isoTimestampSchema,
    updatedAt: isoTimestampSchema,
  })
  .strict();

export type PromptDto = z.infer<typeof promptDtoSchema>;

export const promptListResultSchema = z.array(promptDtoSchema).max(200);

export const promptCreateInputSchema = z
  .object({
    folder: promptFolderSchema,
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(16_000),
  })
  .strict();

export type PromptCreateInput = z.infer<typeof promptCreateInputSchema>;

export const promptUpdateInputSchema = z
  .object({
    id: z.string().uuid(),
    folder: promptFolderSchema.optional(),
    title: z.string().trim().min(1).max(120).optional(),
    body: z.string().trim().min(1).max(16_000).optional(),
  })
  .strict();

export type PromptUpdateInput = z.infer<typeof promptUpdateInputSchema>;

export const promptResolveInputSchema = z
  .object({
    promptId: z.string().uuid(),
    projectId: z.string().uuid().nullable(),
  })
  .strict();

export type PromptResolveInput = z.infer<typeof promptResolveInputSchema>;

export const promptResolveResultSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).max(120),
    text: z.string().min(1).max(16_000),
  })
  .strict();

export type PromptResolveResult = z.infer<typeof promptResolveResultSchema>;

export const playgroundSlotInputSchema = z
  .object({
    providerKeyId: z.string().uuid(),
    model: z.string().min(1).max(128),
  })
  .strict();

export const playgroundRunInputSchema = z
  .object({
    projectId: z.string().uuid().nullable(),
    content: z.string().trim().min(1).max(100_000),
    promptId: z.string().uuid().optional(),
    slots: z.array(playgroundSlotInputSchema).min(2).max(4),
    privacyMode: packetPrivacyModeSchema.optional(),
    extraSystem: z.string().max(20_000).optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(1).max(128_000).nullable().optional(),
  })
  .strict();

export type PlaygroundRunInput = z.infer<typeof playgroundRunInputSchema>;

export const playgroundRunSlotSchema = z
  .object({
    providerKeyId: z.string().uuid(),
    model: z.string().min(1).max(128),
    send: chatSendResultSchema,
  })
  .strict();

export const playgroundRunResultSchema = z
  .object({
    content: z.string().min(1).max(100_000),
    slots: z.array(playgroundRunSlotSchema).min(2).max(4),
  })
  .strict();

export type PlaygroundRunResult = z.infer<typeof playgroundRunResultSchema>;

export const councilRoleSchema = z.enum(["architect", "reviewer", "security", "ux"]);
export const councilRunInputSchema = z.object({
  conversationId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  content: z.string().trim().min(1).max(100_000),
  slots: z.array(playgroundSlotInputSchema.extend({ role: councilRoleSchema })).min(2).max(4),
  synthesis: playgroundSlotInputSchema,
  privacyMode: packetPrivacyModeSchema.optional(),
}).strict();
export type CouncilRunInput = z.infer<typeof councilRunInputSchema>;
export const councilRunResultSchema = z.object({
  slots: z.array(playgroundRunSlotSchema.extend({ role: councilRoleSchema })).min(2).max(4),
  synthesis: playgroundRunSlotSchema,
  divergences: z.array(z.string()).max(12),
}).strict();
export type CouncilRunResult = z.infer<typeof councilRunResultSchema>;

export const artifactKindSchema = z.enum(["mermaid", "html", "markdown", "code"]);

export type ArtifactKindDto = z.infer<typeof artifactKindSchema>;

export const artifactDtoSchema = z
  .object({
    id: z.string().uuid(),
    conversationId: z.string().uuid(),
    familyId: z.string().uuid(),
    sourceMessageId: z.string().uuid().nullable(),
    kind: artifactKindSchema,
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(100_000),
    language: z.string().min(1).max(40).nullable(),
    version: z.number().int().min(1).max(10_000),
    pinned: z.boolean(),
    createdAt: isoTimestampSchema,
  })
  .strict();

export type ArtifactDto = z.infer<typeof artifactDtoSchema>;

export const artifactListResultSchema = z.array(artifactDtoSchema).max(100);

export const artifactsListInputSchema = z
  .object({
    conversationId: z.string().uuid(),
  })
  .strict();

export type ArtifactsListInput = z.infer<typeof artifactsListInputSchema>;

export const artifactSaveVersionInputSchema = z
  .object({
    id: z.string().uuid(),
    body: z.string().trim().min(1).max(100_000),
    title: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export type ArtifactSaveVersionInput = z.infer<typeof artifactSaveVersionInputSchema>;

export const artifactPinInputSchema = z
  .object({
    id: z.string().uuid(),
    pinned: z.boolean(),
  })
  .strict();

export type ArtifactPinInput = z.infer<typeof artifactPinInputSchema>;

export const artifactExportFormatSchema = z.enum(["md", "html", "svg"]);

export const artifactExportInputSchema = z
  .object({
    id: z.string().uuid(),
    format: artifactExportFormatSchema,
    svg: z.string().min(1).max(2_000_000).optional(),
  })
  .strict();

export type ArtifactExportInput = z.infer<typeof artifactExportInputSchema>;

export const artifactExportResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("saved") }).strict(),
  z.object({ status: z.literal("cancelled") }).strict(),
]);

export type ArtifactExportResult = z.infer<typeof artifactExportResultSchema>;

export const skillFolderSchema = promptFolderSchema;

export type SkillFolderDto = z.infer<typeof skillFolderSchema>;

export const skillStepDtoSchema = z
  .object({
    id: z.string().min(1).max(40),
    title: z.string().min(1).max(80),
    section: z.string().min(1).max(4_000),
  })
  .strict();

export const skillDefaultMentionDtoSchema = z
  .object({
    type: mentionTypeSchema,
    query: z.string().min(1).max(260),
  })
  .strict();

export const skillDtoSchema = z
  .object({
    id: z.string().uuid(),
    folder: skillFolderSchema,
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(400),
    prompt: z.string().min(1).max(16_000),
    preferredModel: z.string().min(1).max(128).nullable(),
    defaultMentions: z.array(skillDefaultMentionDtoSchema).max(8),
    steps: z.array(skillStepDtoSchema).max(12),
    allowedTools: z.array(skillAllowedToolSchema).max(8).optional(),
    factoryId: z.string().min(1).max(40).nullable(),
    contractVersion: z.union([z.literal(1), z.literal(2)]),
    createdAt: isoTimestampSchema,
    updatedAt: isoTimestampSchema,
  })
  .strict();

export type SkillDto = z.infer<typeof skillDtoSchema>;

export const skillListResultSchema = z.array(skillDtoSchema).max(200);

export const skillCreateInputSchema = z
  .object({
    folder: skillFolderSchema,
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(400),
    prompt: z.string().trim().min(1).max(16_000),
    preferredModel: z.string().trim().min(1).max(128).nullable(),
    defaultMentions: z.array(skillDefaultMentionDtoSchema).max(8),
    steps: z.array(skillStepDtoSchema).max(12),
    allowedTools: z.array(skillAllowedToolSchema).max(8).optional(),
  })
  .strict();

export type SkillCreateInput = z.infer<typeof skillCreateInputSchema>;

export const skillUpdateInputSchema = z
  .object({
    id: z.string().uuid(),
    folder: skillFolderSchema.optional(),
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(400).optional(),
    prompt: z.string().trim().min(1).max(16_000).optional(),
    preferredModel: z.string().trim().min(1).max(128).nullable().optional(),
    defaultMentions: z.array(skillDefaultMentionDtoSchema).max(8).optional(),
    steps: z.array(skillStepDtoSchema).max(12).optional(),
    allowedTools: z.array(skillAllowedToolSchema).max(8).optional(),
  })
  .strict();

export type SkillUpdateInput = z.infer<typeof skillUpdateInputSchema>;

export const skillResolveInputSchema = z
  .object({
    skillId: z.string().uuid().optional(),
    query: z.string().trim().min(1).max(260).optional(),
    projectId: z.string().uuid().nullable(),
    privacyMode: packetPrivacyModeSchema.optional(),
  })
  .strict()
  .refine((value) => value.skillId !== undefined || value.query !== undefined, {
    message: "skill resolve needs id or query",
  });

export type SkillResolveInput = z.infer<typeof skillResolveInputSchema>;

export const skillResolveResultSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).max(120),
    text: z.string().min(1).max(32_000),
    preferredModel: z.string().min(1).max(128).nullable(),
    defaultMentions: z.array(skillDefaultMentionDtoSchema).max(8),
    steps: z.array(skillStepDtoSchema).max(12),
  })
  .strict();

export type SkillResolveResult = z.infer<typeof skillResolveResultSchema>;
