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
});

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
  healthSamples,
  importJobs,
  contextPackets,
};
