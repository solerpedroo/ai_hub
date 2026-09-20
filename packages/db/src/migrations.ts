export const MIGRATION_0001_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name_cipher TEXT NOT NULL,
  color TEXT,
  instructions_cipher TEXT,
  preferred_model TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  title_cipher TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES messages(id),
  branch_id TEXT NOT NULL,
  is_active_branch INTEGER NOT NULL DEFAULT 1,
  role TEXT NOT NULL,
  content_cipher TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX messages_conversation_idx ON messages(conversation_id);
CREATE INDEX messages_parent_idx ON messages(parent_id);
CREATE INDEX messages_branch_idx ON messages(branch_id);

CREATE TABLE message_receipts (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  provider TEXT,
  model TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  latency_ms INTEGER,
  cost_usd TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE provider_keys (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  keytar_account TEXT NOT NULL UNIQUE,
  last4 TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE conversation_tags (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, tag_id)
);

CREATE TABLE spend_caps (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  limit_usd TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE health_samples (
  id TEXT PRIMARY KEY,
  provider_slug TEXT NOT NULL,
  ok INTEGER NOT NULL,
  latency_ms INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE import_jobs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  report_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE context_packets (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  payload_cipher TEXT NOT NULL,
  token_estimate INTEGER,
  created_at INTEGER NOT NULL
);

CREATE VIRTUAL TABLE messages_fts USING fts5(
  message_id UNINDEXED,
  content,
  tokenize = 'unicode61'
);

INSERT INTO providers (id, slug, name) VALUES
  ('11111111-1111-4111-8111-111111111111', 'openai', 'OpenAI'),
  ('22222222-2222-4222-8222-222222222222', 'anthropic', 'Anthropic'),
  ('33333333-3333-4333-8333-333333333333', 'google', 'Google'),
  ('44444444-4444-4444-8444-444444444444', 'groq', 'Groq'),
  ('55555555-5555-4555-8555-555555555555', 'openrouter', 'OpenRouter');
`;

export const MIGRATION_0002_SQL = `
ALTER TABLE message_receipts ADD COLUMN error_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS message_receipts_message_idx ON message_receipts(message_id);
`;

export const MIGRATION_0003_SQL = `
INSERT INTO providers (id, slug, name) VALUES
  ('66666666-6666-4666-8666-666666666666', 'custom', 'Custom (OpenAI-compatible)');
`;

export const MIGRATION_0004_SQL = `
ALTER TABLE projects ADD COLUMN preferred_provider TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS conversation_tags_pk ON conversation_tags(conversation_id, tag_id);
`;

export const MIGRATION_0005_SQL = `
CREATE UNIQUE INDEX IF NOT EXISTS spend_caps_scope_idx ON spend_caps(scope);
`;

export const MIGRATION_0006_SQL = `
ALTER TABLE conversations ADD COLUMN import_source TEXT;
ALTER TABLE conversations ADD COLUMN external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS conversations_import_identity_idx
  ON conversations(import_source, external_id)
  WHERE import_source IS NOT NULL AND external_id IS NOT NULL;
ALTER TABLE message_receipts ADD COLUMN source TEXT NOT NULL DEFAULT 'chat';
`;

export const MIGRATION_0007_SQL = `
ALTER TABLE context_packets ADD COLUMN privacy_mode TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE context_packets ADD COLUMN origin TEXT NOT NULL DEFAULT '{"source":"compile","projectLabel":"","conversationLabel":""}';
ALTER TABLE context_packets ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE conversations ADD COLUMN active_packet_id TEXT REFERENCES context_packets(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN packet_applied_at INTEGER;
ALTER TABLE messages ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
`;

export const MIGRATION_0008_SQL = `
CREATE TABLE project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  mime TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  token_estimate INTEGER NOT NULL,
  extract_cipher TEXT NOT NULL,
  image_cipher TEXT,
  truncated INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX project_files_project_idx ON project_files(project_id);
`;

export const MIGRATION_0009_SQL = `
CREATE TABLE project_memories (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title_cipher TEXT NOT NULL,
  body_cipher TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX project_memories_project_idx ON project_memories(project_id);
CREATE TABLE file_chunks (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES project_files(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text_cipher TEXT NOT NULL,
  embedding_cipher TEXT NOT NULL,
  token_estimate INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX file_chunks_project_idx ON file_chunks(project_id);
CREATE INDEX file_chunks_file_idx ON file_chunks(file_id);
CREATE TABLE conversation_workspace (
  conversation_id TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  summary_cipher TEXT NOT NULL,
  decisions_cipher TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE conversation_tasks (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  title_cipher TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX conversation_tasks_conversation_idx ON conversation_tasks(conversation_id);
`;

export const MIGRATION_0010_SQL = `
ALTER TABLE conversations ADD COLUMN kind TEXT NOT NULL DEFAULT 'chat';
CREATE TABLE prompts (
  id TEXT PRIMARY KEY,
  folder TEXT NOT NULL,
  title_cipher TEXT NOT NULL,
  body_cipher TEXT NOT NULL,
  factory_id TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX prompts_folder_idx ON prompts(folder);
`;

export const MIGRATION_0011_SQL = `
CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  family_id TEXT NOT NULL,
  source_message_id TEXT,
  kind TEXT NOT NULL,
  title_cipher TEXT NOT NULL,
  body_cipher TEXT NOT NULL,
  language TEXT,
  version INTEGER NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX artifacts_conversation_idx ON artifacts(conversation_id);
CREATE INDEX artifacts_family_idx ON artifacts(family_id);
CREATE INDEX artifacts_message_idx ON artifacts(source_message_id);
`;

export const MIGRATION_0012_SQL = `
CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  folder TEXT NOT NULL,
  title_cipher TEXT NOT NULL,
  description_cipher TEXT NOT NULL,
  definition_cipher TEXT NOT NULL,
  preferred_model TEXT,
  factory_id TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX skills_folder_idx ON skills(folder);
`;

export const MIGRATION_0013_SQL = `
CREATE TABLE scoped_spend_caps (
  id TEXT PRIMARY KEY,
  dimension TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  limit_usd TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX scoped_spend_caps_dimension_subject_idx
  ON scoped_spend_caps(dimension, subject_id);
`;

export const MIGRATION_0014_SQL = `
CREATE TABLE spend_reservations (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  provider_slug TEXT NOT NULL,
  amount_usd TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX spend_reservations_expires_idx ON spend_reservations(expires_at);
`;

export const MIGRATIONS: readonly { version: number; sql: string }[] = [
  { version: 1, sql: MIGRATION_0001_SQL },
  { version: 2, sql: MIGRATION_0002_SQL },
  { version: 3, sql: MIGRATION_0003_SQL },
  { version: 4, sql: MIGRATION_0004_SQL },
  { version: 5, sql: MIGRATION_0005_SQL },
  { version: 6, sql: MIGRATION_0006_SQL },
  { version: 7, sql: MIGRATION_0007_SQL },
  { version: 8, sql: MIGRATION_0008_SQL },
  { version: 9, sql: MIGRATION_0009_SQL },
  { version: 10, sql: MIGRATION_0010_SQL },
  { version: 11, sql: MIGRATION_0011_SQL },
  { version: 12, sql: MIGRATION_0012_SQL },
  { version: 13, sql: MIGRATION_0013_SQL },
  { version: 14, sql: MIGRATION_0014_SQL },
];
