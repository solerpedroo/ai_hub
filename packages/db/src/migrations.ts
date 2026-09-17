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

export const MIGRATIONS: readonly { version: number; sql: string }[] = [
  { version: 1, sql: MIGRATION_0001_SQL },
  { version: 2, sql: MIGRATION_0002_SQL },
];
