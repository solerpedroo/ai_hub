import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  nameCipher: text("name_cipher").notNull(),
  color: text("color"),
  instructionsCipher: text("instructions_cipher"),
  preferredModel: text("preferred_model"),
  preferredProvider: text("preferred_provider"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  projectId: text("project_id"),
  titleCipher: text("title_cipher").notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  importSource: text("import_source"),
  externalId: text("external_id"),
  activePacketId: text("active_packet_id"),
  packetAppliedAt: integer("packet_applied_at", { mode: "number" }),
  kind: text("kind").notNull().default("chat"),
  runMode: text("run_mode").notNull().default("assist"),
  effortLevel: text("effort_level").notNull().default("medium"),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  parentId: text("parent_id"),
  branchId: text("branch_id").notNull(),
  isActiveBranch: integer("is_active_branch", { mode: "number" }).notNull(),
  role: text("role").notNull(),
  contentCipher: text("content_cipher").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  pinned: integer("pinned", { mode: "number" }).notNull().default(0),
});

export const messageReceipts = sqliteTable("message_receipts", {
  id: text("id").primaryKey(),
  messageId: text("message_id").notNull(),
  provider: text("provider"),
  model: text("model"),
  tokensIn: integer("tokens_in", { mode: "number" }),
  tokensOut: integer("tokens_out", { mode: "number" }),
  latencyMs: integer("latency_ms", { mode: "number" }),
  costUsd: text("cost_usd"),
  errorCode: text("error_code"),
  source: text("source").notNull().default("chat"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const providers = sqliteTable(
  "providers",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
  },
  (table) => [uniqueIndex("providers_slug_idx").on(table.slug)],
);

export const providerKeys = sqliteTable(
  "provider_keys",
  {
    id: text("id").primaryKey(),
    providerId: text("provider_id").notNull(),
    label: text("label").notNull(),
    keytarAccount: text("keytar_account").notNull(),
    last4: text("last4").notNull(),
    status: text("status").notNull(),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
  },
  (table) => [uniqueIndex("provider_keys_account_idx").on(table.keytarAccount)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
  },
  (table) => [uniqueIndex("tags_name_idx").on(table.name)],
);

export const conversationTags = sqliteTable("conversation_tags", {
  conversationId: text("conversation_id").notNull(),
  tagId: text("tag_id").notNull(),
});

export const spendCaps = sqliteTable("spend_caps", {
  id: text("id").primaryKey(),
  scope: text("scope").notNull(),
  limitUsd: text("limit_usd").notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const scopedSpendCaps = sqliteTable(
  "scoped_spend_caps",
  {
    id: text("id").primaryKey(),
    dimension: text("dimension").notNull(),
    subjectId: text("subject_id").notNull(),
    limitUsd: text("limit_usd").notNull(),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
  },
  (table) => [uniqueIndex("scoped_spend_caps_dimension_subject_idx").on(table.dimension, table.subjectId)],
);

export const spendReservations = sqliteTable("spend_reservations", {
  id: text("id").primaryKey(),
  projectId: text("project_id"),
  providerSlug: text("provider_slug").notNull(),
  amountUsd: text("amount_usd").notNull(),
  expiresAt: integer("expires_at", { mode: "number" }).notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const healthSamples = sqliteTable("health_samples", {
  id: text("id").primaryKey(),
  providerSlug: text("provider_slug").notNull(),
  ok: integer("ok", { mode: "number" }).notNull(),
  latencyMs: integer("latency_ms", { mode: "number" }),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const importJobs = sqliteTable("import_jobs", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  status: text("status").notNull(),
  reportJson: text("report_json"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const contextPackets = sqliteTable("context_packets", {
  id: text("id").primaryKey(),
  projectId: text("project_id"),
  payloadCipher: text("payload_cipher").notNull(),
  tokenEstimate: integer("token_estimate", { mode: "number" }),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  privacyMode: text("privacy_mode").notNull().default("standard"),
  origin: text("origin").notNull().default('{"source":"compile","projectLabel":"","conversationLabel":""}'),
  version: integer("version", { mode: "number" }).notNull().default(1),
});

export const projectFiles = sqliteTable("project_files", {
  id: text("id").primaryKey(),
  projectId: text("project_id"),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  mime: text("mime").notNull(),
  byteSize: integer("byte_size", { mode: "number" }).notNull(),
  tokenEstimate: integer("token_estimate", { mode: "number" }).notNull(),
  extractCipher: text("extract_cipher").notNull(),
  imageCipher: text("image_cipher"),
  truncated: integer("truncated", { mode: "number" }).notNull().default(0),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const projectMemories = sqliteTable("project_memories", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  titleCipher: text("title_cipher").notNull(),
  bodyCipher: text("body_cipher").notNull(),
  source: text("source").notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const fileChunks = sqliteTable("file_chunks", {
  id: text("id").primaryKey(),
  fileId: text("file_id").notNull(),
  projectId: text("project_id"),
  chunkIndex: integer("chunk_index", { mode: "number" }).notNull(),
  textCipher: text("text_cipher").notNull(),
  embeddingCipher: text("embedding_cipher").notNull(),
  tokenEstimate: integer("token_estimate", { mode: "number" }).notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const conversationWorkspace = sqliteTable("conversation_workspace", {
  conversationId: text("conversation_id").primaryKey(),
  summaryCipher: text("summary_cipher").notNull(),
  decisionsCipher: text("decisions_cipher").notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const conversationTasks = sqliteTable("conversation_tasks", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  titleCipher: text("title_cipher").notNull(),
  done: integer("done", { mode: "number" }).notNull().default(0),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  sourceMessageId: text("source_message_id"),
});

export const projectNotes = sqliteTable("project_notes", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  sourceMessageId: text("source_message_id"),
  titleCipher: text("title_cipher").notNull(),
  bodyCipher: text("body_cipher").notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const noteTags = sqliteTable("note_tags", {
  noteId: text("note_id").notNull(),
  tagId: text("tag_id").notNull(),
});

export const prompts = sqliteTable("prompts", {
  id: text("id").primaryKey(),
  folder: text("folder").notNull(),
  titleCipher: text("title_cipher").notNull(),
  bodyCipher: text("body_cipher").notNull(),
  factoryId: text("factory_id"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const skills = sqliteTable("skills", {
  id: text("id").primaryKey(),
  folder: text("folder").notNull(),
  titleCipher: text("title_cipher").notNull(),
  descriptionCipher: text("description_cipher").notNull(),
  definitionCipher: text("definition_cipher").notNull(),
  preferredModel: text("preferred_model"),
  factoryId: text("factory_id"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const artifacts = sqliteTable("artifacts", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  familyId: text("family_id").notNull(),
  sourceMessageId: text("source_message_id"),
  kind: text("kind").notNull(),
  titleCipher: text("title_cipher").notNull(),
  bodyCipher: text("body_cipher").notNull(),
  language: text("language"),
  version: integer("version", { mode: "number" }).notNull(),
  pinned: integer("pinned", { mode: "number" }).notNull().default(0),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const projectToolRoots = sqliteTable("project_tool_roots", {
  projectId: text("project_id").primaryKey(),
  rootCipher: text("root_cipher").notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const projectToolPermissions = sqliteTable(
  "project_tool_permissions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    toolId: text("tool_id").notNull(),
    operation: text("operation").notNull(),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [uniqueIndex("project_tool_permissions_scope_idx").on(table.projectId, table.toolId, table.operation)],
);

export const agentRuns = sqliteTable("agent_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  conversationId: text("conversation_id").notNull(),
  parentRunId: text("parent_run_id"),
  kind: text("kind").notNull().default("single"),
  role: text("role").notNull().default("single"),
  graphVersion: integer("graph_version", { mode: "number" }).notNull().default(1),
  budgetMode: text("budget_mode").notNull().default("single"),
  status: text("status").notNull(),
  provider: text("provider").notNull(),
  providerKeyId: text("provider_key_id").notNull(),
  model: text("model").notNull(),
  goalCipher: text("goal_cipher").notNull(),
  planCipher: text("plan_cipher").notNull(),
  sourceSkillId: text("source_skill_id"),
  maxSteps: integer("max_steps").notNull(),
  budgetUsd: text("budget_usd").notNull(),
  timeoutSeconds: integer("timeout_seconds").notNull(),
  reportArtifactId: text("report_artifact_id"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  startedAt: integer("started_at", { mode: "number" }),
  finishedAt: integer("finished_at", { mode: "number" }),
});

export const agentSteps = sqliteTable(
  "agent_steps",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    kind: text("kind").notNull(),
    titleCipher: text("title_cipher").notNull(),
    status: text("status").notNull(),
    toolId: text("tool_id"),
    summaryCipher: text("summary_cipher"),
    detailCipher: text("detail_cipher"),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    costUsd: text("cost_usd"),
    startedAt: integer("started_at", { mode: "number" }),
    finishedAt: integer("finished_at", { mode: "number" }),
  },
  (table) => [uniqueIndex("agent_steps_run_ordinal_idx").on(table.runId, table.ordinal)],
);

export const agentHandoffs = sqliteTable(
  "agent_handoffs",
  {
    id: text("id").primaryKey(),
    rootRunId: text("root_run_id").notNull(),
    fromRunId: text("from_run_id").notNull(),
    toRunId: text("to_run_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    joinKind: text("join_kind").notNull(),
    status: text("status").notNull(),
    systemMessageCipher: text("system_message_cipher").notNull(),
    packetSubsetCipher: text("packet_subset_cipher").notNull(),
    tokenEstimate: integer("token_estimate").notNull(),
    summaryCipher: text("summary_cipher").notNull(),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    finishedAt: integer("finished_at", { mode: "number" }),
  },
  (table) => [uniqueIndex("agent_handoffs_root_ordinal_idx").on(table.rootRunId, table.ordinal)],
);

export const schema = {
  projects,
  conversations,
  messages,
  messageReceipts,
  providers,
  providerKeys,
  settings,
  tags,
  conversationTags,
  spendCaps,
  scopedSpendCaps,
  healthSamples,
  importJobs,
  contextPackets,
  projectFiles,
  projectMemories,
  fileChunks,
  conversationWorkspace,
  conversationTasks,
  projectNotes,
  noteTags,
  prompts,
  skills,
  artifacts,
  projectToolRoots,
  projectToolPermissions,
  agentRuns,
  agentSteps,
  agentHandoffs,
};
