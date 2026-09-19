import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, isNotNull, isNull, ne } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type Database from "better-sqlite3";
import {
  decryptUtf8,
  encryptUtf8,
  last4OfSecret,
  maskSecret,
  providerKeyAccount,
  redactSecrets,
  type SecretStore,
} from "@ai-hub/security";
import {
  conversations,
  conversationTags,
  conversationTasks,
  conversationWorkspace,
  healthSamples,
  contextPackets,
  fileChunks,
  importJobs,
  projectFiles,
  projectMemories,
  prompts,
  artifacts,
  messageReceipts,
  messages,
  projects,
  providerKeys,
  providers,
  settings,
  spendCaps,
  tags,
  type schema,
} from "./schema";

export type HubDrizzle = BetterSQLite3Database<typeof schema>;

export interface ProjectRecord {
  id: string;
  name: string;
  color: string | null;
  instructions: string | null;
  preferredModel: string | null;
  preferredProvider: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWriteFields {
  color?: string | null;
  instructions?: string | null;
  preferredModel?: string | null;
  preferredProvider?: string | null;
}

export interface ConversationRecord {
  id: string;
  projectId: string | null;
  title: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  importSource: "chatgpt" | "claude" | "gemini" | null;
  activePacketId: string | null;
  packetAppliedAt: string | null;
  kind: "chat" | "playground";
}

export interface SearchHitRecord {
  conversationId: string;
  projectId: string | null;
  conversationTitle: string;
  messageId: string | null;
  snippet: string;
}

export type MessageRole = "user" | "assistant" | "system";
export type MessageStatus = "complete" | "streaming" | "interrupted" | "aborted";

export interface ReceiptRecord {
  id: string;
  messageId: string;
  provider: string | null;
  model: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  latencyMs: number | null;
  costUsd: string | null;
  errorCode: string | null;
  source: "chat" | "import";
  createdAt: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  parentId: string | null;
  branchId: string;
  isActiveBranch: boolean;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  createdAt: string;
  receipt: ReceiptRecord | null;
  pinned: boolean;
}

export interface ProviderRecord {
  id: string;
  slug: string;
  name: string;
}

export interface ProviderKeyRecord {
  id: string;
  providerSlug: string;
  label: string;
  maskedKey: string;
  last4: string;
  status: "active" | "invalid";
  endpointUrl: string | null;
  createdAt: string;
}

export interface HealthSampleRecord {
  id: string;
  providerSlug: string;
  ok: boolean;
  latencyMs: number | null;
  createdAt: string;
}

export interface SpendCapRecord {
  id: string;
  scope: string;
  limitUsd: string;
  createdAt: string;
}

export interface ContextPacketRecord {
  id: string;
  projectId: string | null;
  tokenEstimate: number | null;
  privacyMode: "standard" | "strict";
  origin: {
    source: "compile" | "import";
    projectLabel: string;
    conversationLabel: string;
  };
  version: number;
  createdAt: string;
}

export interface ContextPacketStored extends ContextPacketRecord {
  payloadJson: string;
}

export interface ProjectFileRecord {
  id: string;
  projectId: string | null;
  name: string;
  kind: string;
  mime: string;
  byteSize: number;
  tokenEstimate: number;
  extract: string;
  imageJson: string | null;
  truncated: boolean;
  createdAt: string;
}

export interface ProjectMemoryRecord {
  id: string;
  projectId: string;
  title: string;
  body: string;
  source: "manual" | "suggested";
  createdAt: string;
  updatedAt: string;
}

export interface FileChunkRecord {
  id: string;
  fileId: string;
  projectId: string | null;
  fileName: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
  tokenEstimate: number;
}

export interface ConversationWorkspaceRecord {
  conversationId: string;
  summary: string;
  decisions: string[];
  updatedAt: string;
}

export interface ConversationTaskRecord {
  id: string;
  conversationId: string;
  title: string;
  done: boolean;
  createdAt: string;
}

export type PromptFolder = "development" | "studies" | "work";

export interface PromptRecord {
  id: string;
  folder: PromptFolder;
  title: string;
  body: string;
  factoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ArtifactKind = "mermaid" | "html" | "markdown" | "code";

export interface ArtifactRecord {
  id: string;
  conversationId: string;
  familyId: string;
  sourceMessageId: string | null;
  kind: ArtifactKind;
  title: string;
  body: string;
  language: string | null;
  version: number;
  pinned: boolean;
  createdAt: string;
}

export interface SpendCapOverrideRecord {
  at: string;
  scope: string;
  limitUsd: string;
  estimatedUsd: string | null;
  conversationId: string;
  model: string;
  provider: string;
}

export interface ProviderSecretRecord {
  id: string;
  providerSlug: string;
  secret: string;
}

export interface AppearanceRecord {
  theme: "light" | "dark" | "system";
  locale: "pt-BR" | "en";
}

export interface WorkspaceSessionRecord {
  projectId: string | null;
  conversationId: string | null;
  model: string;
  temperature: number;
  maxTokens: number | null;
  extraSystem: string;
  importedInbox: boolean;
}

export interface AppPrefsRecord {
  onboardingComplete: boolean;
  crashReporterOptIn: boolean;
  lastUpdateCheckAt: string | null;
  lastUpdateStatus: "idle" | "skipped" | "uptodate" | "available" | "unavailable";
  lastWizardTtftMs: number | null;
}

const DEFAULT_APP_PREFS: AppPrefsRecord = {
  onboardingComplete: false,
  crashReporterOptIn: false,
  lastUpdateCheckAt: null,
  lastUpdateStatus: "idle",
  lastWizardTtftMs: null,
};

const UPDATE_STATUSES: readonly AppPrefsRecord["lastUpdateStatus"][] = [
  "idle",
  "skipped",
  "uptodate",
  "available",
  "unavailable",
];

const APPEARANCE_KEY = "appearance";
const APP_PREFS_KEY = "app-prefs";
const SESSION_KEY = "workspace-session";
const BRANCH_LABELS_PREFIX = "branch-labels:";
const CUSTOM_BASE_URL_PREFIX = "custom-base-url:";
const SPEND_CAP_OVERRIDES_KEY = "spend-cap-overrides";
const MEMORY_OPT_OUT_PREFIX = "memory-opt-out:";
const PROMPT_FACTORY_SEEDED_KEY = "prompt-factory-seeded";
const DEFAULT_SESSION: WorkspaceSessionRecord = {
  projectId: null,
  conversationId: null,
  model: "gpt-4o-mini",
  temperature: 1,
  maxTokens: null,
  extraSystem: "",
  importedInbox: false,
};

function maskListedKey(last4: string, slug: string): string {
  if (last4.length === 0) {
    return slug === "openai" || slug === "openrouter" ? "sk-…" : "…";
  }
  if (slug === "openai" || slug === "openrouter") {
    return `sk-…${last4}`;
  }
  return `…${last4}`;
}

function assertSafeEndpointUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Invalid custom base URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid custom base URL");
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new Error("Invalid custom base URL");
  }
  const banned = new Set(["api_key", "apikey", "key", "token", "secret", "access_token"]);
  for (const name of parsed.searchParams.keys()) {
    if (banned.has(name.toLowerCase())) {
      throw new Error("Invalid custom base URL");
    }
  }
  return raw.replace(/\/$/, "");
}

function endpointUrlForDto(raw: string | null): string | null {
  if (raw === null) {
    return null;
  }
  try {
    return assertSafeEndpointUrl(raw);
  } catch {
    return null;
  }
}

function parseUsdMicros(value: string | null): number {
  if (value === null || value.length === 0) {
    return 0;
  }
  const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(value);
  if (!match) {
    return 0;
  }
  const whole = Number(match[1]);
  const frac = (match[2] ?? "").padEnd(6, "0");
  return whole * 1_000_000 + Number(frac);
}

function microsToUsdText(micros: number): string {
  const abs = Math.abs(Math.trunc(micros));
  const whole = Math.floor(abs / 1_000_000);
  const frac = String(abs % 1_000_000).padStart(6, "0");
  return `${micros < 0 ? "-" : ""}${whole}.${frac}`;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

const PROJECT_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function normalizeProjectColor(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.length === 0) {
    return null;
  }
  return PROJECT_COLOR_RE.test(value) ? value : null;
}

function searchTokens(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function matchesAllTokens(haystack: string, tokens: string[]): boolean {
  const lower = haystack.toLowerCase();
  return tokens.every((token) => lower.includes(token));
}

function snippetAround(text: string, token: string, radius = 48): string {
  const idx = text.toLowerCase().indexOf(token.toLowerCase());
  if (idx < 0) {
    return text.slice(0, radius * 2);
  }
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + token.length + radius);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max);
}

function toSearchHit(input: {
  conversationId: string;
  projectId: string | null;
  title: string;
  messageId: string | null;
  snippet: string;
}): SearchHitRecord {
  return {
    conversationId: input.conversationId,
    projectId: input.projectId,
    conversationTitle: clip(redactSecrets(input.title), 200),
    messageId: input.messageId,
    snippet: clip(redactSecrets(input.snippet), 400),
  };
}

function asRole(value: string): MessageRole {
  if (value === "user" || value === "assistant" || value === "system") {
    return value;
  }
  throw new Error("Unknown message role");
}

function asStatus(value: string): MessageStatus {
  if (
    value === "complete" ||
    value === "streaming" ||
    value === "interrupted" ||
    value === "aborted"
  ) {
    return value;
  }
  throw new Error("Unknown message status");
}

export class HubRepos {
  constructor(
    private readonly db: HubDrizzle,
    private readonly sqlite: Database.Database,
    private readonly masterKey: Buffer,
    private readonly secrets: SecretStore,
  ) {}

  private toReceipt(row: typeof messageReceipts.$inferSelect): ReceiptRecord {
    return {
      id: row.id,
      messageId: row.messageId,
      provider: row.provider,
      model: row.model,
      tokensIn: row.tokensIn,
      tokensOut: row.tokensOut,
      latencyMs: row.latencyMs,
      costUsd: row.costUsd,
      errorCode: row.errorCode,
      source: row.source === "import" ? "import" : "chat",
      createdAt: iso(row.createdAt),
    };
  }

  private toProject(row: typeof projects.$inferSelect): ProjectRecord {
    return {
      id: row.id,
      name: decryptUtf8(row.nameCipher, this.masterKey),
      color: normalizeProjectColor(row.color),
      instructions: row.instructionsCipher
        ? decryptUtf8(row.instructionsCipher, this.masterKey)
        : null,
      preferredModel: row.preferredModel ?? null,
      preferredProvider: row.preferredProvider ?? null,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    };
  }

  private toConversation(row: typeof conversations.$inferSelect): ConversationRecord {
    return {
      id: row.id,
      projectId: row.projectId,
      title: decryptUtf8(row.titleCipher, this.masterKey),
      tags: this.listConversationTagNames(row.id),
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
      importSource:
        row.importSource === "chatgpt" || row.importSource === "claude" || row.importSource === "gemini"
          ? row.importSource
          : null,
      activePacketId: row.activePacketId ?? null,
      packetAppliedAt: row.packetAppliedAt !== null && row.packetAppliedAt !== undefined ? iso(row.packetAppliedAt) : null,
      kind: row.kind === "playground" ? "playground" : "chat",
    };
  }

  private toMessage(
    row: typeof messages.$inferSelect,
    receipt: ReceiptRecord | null,
  ): MessageRecord {
    return {
      id: row.id,
      conversationId: row.conversationId,
      parentId: row.parentId,
      branchId: row.branchId,
      isActiveBranch: row.isActiveBranch === 1,
      role: asRole(row.role),
      content: decryptUtf8(row.contentCipher, this.masterKey),
      status: asStatus(row.status),
      createdAt: iso(row.createdAt),
      receipt,
      pinned: row.pinned === 1,
    };
  }

  getReceipt(messageId: string): ReceiptRecord | null {
    const row = this.db
      .select()
      .from(messageReceipts)
      .where(eq(messageReceipts.messageId, messageId))
      .all()
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    return row ? this.toReceipt(row) : null;
  }

  getMessage(id: string): MessageRecord | null {
    const row = this.db.select().from(messages).where(eq(messages.id, id)).get();
    if (!row) {
      return null;
    }
    return this.toMessage(row, this.getReceipt(id));
  }

  listProjects(): ProjectRecord[] {
    return this.db
      .select()
      .from(projects)
      .all()
      .map((row) => this.toProject(row))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getProject(id: string): ProjectRecord | null {
    const row = this.db.select().from(projects).where(eq(projects.id, id)).get();
    return row ? this.toProject(row) : null;
  }

  createProject(name: string, fields: ProjectWriteFields = {}): ProjectRecord {
    const now = Date.now();
    const id = randomUUID();
    const instructions =
      fields.instructions !== undefined && fields.instructions !== null && fields.instructions.trim().length > 0
        ? fields.instructions.trim()
        : null;
    this.db
      .insert(projects)
      .values({
        id,
        nameCipher: encryptUtf8(name, this.masterKey),
        color: normalizeProjectColor(fields.color),
        instructionsCipher: instructions ? encryptUtf8(instructions, this.masterKey) : null,
        preferredModel: fields.preferredModel ?? null,
        preferredProvider: fields.preferredProvider ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const created = this.getProject(id);
    if (!created) {
      throw new Error("Project not found");
    }
    return created;
  }

  updateProject(id: string, name: string, fields: ProjectWriteFields = {}): ProjectRecord {
    const existing = this.getProject(id);
    if (!existing) {
      throw new Error("Project not found");
    }
    const now = Date.now();
    const instructions =
      fields.instructions !== undefined
        ? fields.instructions !== null && fields.instructions.trim().length > 0
          ? fields.instructions.trim()
          : null
        : existing.instructions;
    const color = fields.color !== undefined ? normalizeProjectColor(fields.color) : existing.color;
    const preferredModel = fields.preferredModel !== undefined ? fields.preferredModel : existing.preferredModel;
    const preferredProvider =
      fields.preferredProvider !== undefined ? fields.preferredProvider : existing.preferredProvider;
    this.db
      .update(projects)
      .set({
        nameCipher: encryptUtf8(name, this.masterKey),
        color,
        instructionsCipher: instructions ? encryptUtf8(instructions, this.masterKey) : null,
        preferredModel,
        preferredProvider,
        updatedAt: now,
      })
      .where(eq(projects.id, id))
      .run();
    const updated = this.getProject(id);
    if (!updated) {
      throw new Error("Project not found");
    }
    return updated;
  }

  removeProject(id: string): void {
    this.db.update(conversations).set({ projectId: null }).where(eq(conversations.projectId, id)).run();
    this.db.delete(projects).where(eq(projects.id, id)).run();
  }

  listConversations(projectId: string | null, inbox: "avulsas" | "imported" = "avulsas"): ConversationRecord[] {
    const rows =
      projectId === null
        ? inbox === "imported"
          ? this.db
              .select()
              .from(conversations)
              .where(and(isNull(conversations.projectId), isNotNull(conversations.importSource)))
              .all()
          : this.db
              .select()
              .from(conversations)
              .where(and(isNull(conversations.projectId), isNull(conversations.importSource)))
              .all()
        : this.db.select().from(conversations).where(eq(conversations.projectId, projectId)).all();
    return rows
      .map((row) => this.toConversation(row))
      .filter((item) => item.kind !== "playground")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getConversation(id: string): ConversationRecord | null {
    const row = this.db.select().from(conversations).where(eq(conversations.id, id)).get();
    return row ? this.toConversation(row) : null;
  }

  createConversation(
    projectId: string | null,
    title: string,
    kind: "chat" | "playground" = "chat",
  ): ConversationRecord {
    const now = Date.now();
    const id = randomUUID();
    this.db
      .insert(conversations)
      .values({
        id,
        projectId,
        titleCipher: encryptUtf8(title, this.masterKey),
        createdAt: now,
        updatedAt: now,
        importSource: null,
        externalId: null,
        kind,
      })
      .run();
    return {
      id,
      projectId,
      title,
      tags: [],
      createdAt: iso(now),
      updatedAt: iso(now),
      importSource: null,
      activePacketId: null,
      packetAppliedAt: null,
      kind,
    };
  }

  removeConversation(id: string): void {
    this.db.delete(artifacts).where(eq(artifacts.conversationId, id)).run();
    this.db.delete(conversationTags).where(eq(conversationTags.conversationId, id)).run();
    this.db.delete(conversations).where(eq(conversations.id, id)).run();
  }

  moveConversation(id: string, projectId: string | null): ConversationRecord {
    const existing = this.getConversation(id);
    if (!existing) {
      throw new Error("Conversation not found");
    }
    if (projectId) {
      const project = this.getProject(projectId);
      if (!project) {
        throw new Error("Project not found");
      }
    }
    const now = Date.now();
    this.db
      .update(conversations)
      .set({
        projectId,
        updatedAt: now,
        activePacketId: null,
        packetAppliedAt: null,
      })
      .where(eq(conversations.id, id))
      .run();
    const moved = this.getConversation(id);
    if (!moved) {
      throw new Error("Conversation not found");
    }
    return moved;
  }

  findConversationByImportIdentity(
    source: "chatgpt" | "claude" | "gemini",
    externalId: string,
  ): ConversationRecord | null {
    const row = this.db
      .select()
      .from(conversations)
      .where(and(eq(conversations.importSource, source), eq(conversations.externalId, externalId)))
      .get();
    return row ? this.toConversation(row) : null;
  }

  importConversation(input: {
    projectId: string | null;
    source: "chatgpt" | "claude" | "gemini";
    externalId: string;
    title: string;
    createdAtMs: number;
    updatedAtMs: number;
    messages: Array<{ role: MessageRole; content: string; createdAtMs: number }>;
  }): { outcome: "created" | "skipped" | "empty"; conversationId: string | null } {
    if (input.messages.length === 0) {
      return { outcome: "empty", conversationId: null };
    }
    const existing = this.findConversationByImportIdentity(input.source, input.externalId);
    if (existing) {
      return { outcome: "skipped", conversationId: existing.id };
    }
    const title = redactSecrets(input.title).slice(0, 200) || "Imported chat";
    const id = randomUUID();
    const createdAt = input.createdAtMs;
    const updatedAt = input.updatedAtMs;
    this.sqlite.transaction(() => {
      this.db
        .insert(conversations)
        .values({
          id,
          projectId: input.projectId,
          titleCipher: encryptUtf8(title, this.masterKey),
          createdAt,
          updatedAt,
          importSource: input.source,
          externalId: input.externalId,
        })
        .run();
      let parentId: string | null = null;
      let branchId: string | null = null;
      for (const message of input.messages) {
        const stored = this.createMessage({
          conversationId: id,
          role: message.role,
          content: redactSecrets(message.content),
          parentId,
          branchId,
          status: "complete",
          createdAtMs: message.createdAtMs,
        });
        parentId = stored.id;
        branchId = stored.branchId;
        if (message.role !== "assistant") {
          continue;
        }
        this.createReceipt({
          messageId: stored.id,
          provider: input.source,
          model: null,
          tokensIn: null,
          tokensOut: null,
          latencyMs: null,
          costUsd: null,
          errorCode: null,
          source: "import",
        });
      }
      this.db.update(conversations).set({ updatedAt }).where(eq(conversations.id, id)).run();
    })();
    return { outcome: "created", conversationId: id };
  }

  createImportJob(source: "chatgpt" | "claude" | "gemini"): { id: string; createdAt: string } {
    const id = randomUUID();
    const now = Date.now();
    this.db
      .insert(importJobs)
      .values({
        id,
        source,
        status: "queued",
        reportJson: null,
        createdAt: now,
      })
      .run();
    return { id, createdAt: iso(now) };
  }

  updateImportJob(
    id: string,
    status: "queued" | "running" | "complete" | "cancelled" | "failed",
    reportJson: string | null,
  ): void {
    this.db.update(importJobs).set({ status, reportJson }).where(eq(importJobs.id, id)).run();
  }

  listConversationTagNames(conversationId: string): string[] {
    const links = this.db
      .select()
      .from(conversationTags)
      .where(eq(conversationTags.conversationId, conversationId))
      .all();
    const names: string[] = [];
    for (const link of links) {
      const tag = this.db.select().from(tags).where(eq(tags.id, link.tagId)).get();
      if (tag) {
        names.push(tag.name);
      }
    }
    return names.sort((a, b) => a.localeCompare(b));
  }

  setConversationTags(conversationId: string, names: string[]): ConversationRecord {
    const existing = this.getConversation(conversationId);
    if (!existing) {
      throw new Error("Conversation not found");
    }
    this.db.delete(conversationTags).where(eq(conversationTags.conversationId, conversationId)).run();
    const unique: string[] = [];
    for (const raw of names) {
      const name = raw.trim();
      if (name.length === 0 || unique.includes(name)) {
        continue;
      }
      unique.push(name);
      if (unique.length >= 20) {
        break;
      }
    }
    for (const name of unique) {
      const tag = this.getOrCreateTag(name);
      this.db.insert(conversationTags).values({ conversationId, tagId: tag.id }).run();
    }
    const updated = this.getConversation(conversationId);
    if (!updated) {
      throw new Error("Conversation not found");
    }
    return updated;
  }

  searchWorkspace(query: string, limit = 50): SearchHitRecord[] {
    const tokens = searchTokens(query);
    if (tokens.length === 0) {
      return [];
    }
    const hits: SearchHitRecord[] = [];
    const rows = this.db
      .select()
      .from(conversations)
      .all()
      .sort((a, b) => b.updatedAt - a.updatedAt);
    for (const row of rows) {
      if (hits.length >= limit) {
        break;
      }
      if (row.kind === "playground") {
        continue;
      }
      const title = decryptUtf8(row.titleCipher, this.masterKey);
      const titleMatched = matchesAllTokens(title, tokens);
      let messageMatched = false;
      const messageRows = this.db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, row.id))
        .all();
      for (const message of messageRows) {
        if (hits.length >= limit) {
          break;
        }
        const content = decryptUtf8(message.contentCipher, this.masterKey);
        if (!matchesAllTokens(content, tokens)) {
          continue;
        }
        messageMatched = true;
        hits.push(
          toSearchHit({
            conversationId: row.id,
            projectId: row.projectId,
            title,
            messageId: message.id,
            snippet: snippetAround(content, tokens[0] ?? ""),
          }),
        );
      }
      if (titleMatched && !messageMatched && hits.length < limit) {
        hits.push(
          toSearchHit({
            conversationId: row.id,
            projectId: row.projectId,
            title,
            messageId: null,
            snippet: title,
          }),
        );
      }
    }
    return hits;
  }

  private getOrCreateTag(name: string): { id: string; name: string } {
    const existing = this.db.select().from(tags).where(eq(tags.name, name)).get();
    if (existing) {
      return existing;
    }
    const id = randomUUID();
    this.db.insert(tags).values({ id, name }).run();
    return { id, name };
  }

  listMessages(conversationId: string): MessageRecord[] {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .all()
      .map((row) => this.toMessage(row, this.getReceipt(row.id)))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  createMessage(input: {
    conversationId: string;
    role: MessageRole;
    content: string;
    parentId: string | null;
    branchId: string | null;
    status?: MessageStatus;
    createdAtMs?: number;
  }): MessageRecord {
    const conversation = this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, input.conversationId))
      .get();
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    let branchId = input.branchId;
    if (input.parentId) {
      const parent = this.db.select().from(messages).where(eq(messages.id, input.parentId)).get();
      if (!parent || parent.conversationId !== input.conversationId) {
        throw new Error("Parent message not found");
      }
      branchId = branchId ?? parent.branchId;
    }
    branchId = branchId ?? randomUUID();

    const now = input.createdAtMs ?? Date.now();
    const id = randomUUID();
    const status = input.status ?? "complete";
    this.db
      .insert(messages)
      .values({
        id,
        conversationId: input.conversationId,
        parentId: input.parentId,
        branchId,
        isActiveBranch: 1,
        role: input.role,
        contentCipher: encryptUtf8(input.content, this.masterKey),
        status,
        createdAt: now,
        pinned: 0,
      })
      .run();
    this.db
      .update(conversations)
      .set({ updatedAt: now })
      .where(eq(conversations.id, input.conversationId))
      .run();
    this.activateAmongSiblings(id);
    const stored = this.getMessage(id);
    if (!stored) {
      throw new Error("Message not found");
    }
    return stored;
  }

  private activateAmongSiblings(messageId: string): void {
    const row = this.db.select().from(messages).where(eq(messages.id, messageId)).get();
    if (!row) {
      throw new Error("Message not found");
    }
    const siblingFilter =
      row.parentId === null
        ? and(
            eq(messages.conversationId, row.conversationId),
            isNull(messages.parentId),
            ne(messages.id, messageId),
          )
        : and(
            eq(messages.conversationId, row.conversationId),
            eq(messages.parentId, row.parentId),
            ne(messages.id, messageId),
          );
    if (siblingFilter) {
      this.db.update(messages).set({ isActiveBranch: 0 }).where(siblingFilter).run();
    }
    this.db.update(messages).set({ isActiveBranch: 1 }).where(eq(messages.id, messageId)).run();
  }

  activatePathThrough(id: string): MessageRecord {
    const target = this.getMessage(id);
    if (!target) {
      throw new Error("Message not found");
    }
    const chain: string[] = [];
    const seen = new Set<string>();
    let current: typeof messages.$inferSelect | undefined = this.db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .get();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      chain.push(current.id);
      current = current.parentId
        ? this.db.select().from(messages).where(eq(messages.id, current.parentId)).get()
        : undefined;
    }
    for (const nodeId of chain) {
      this.activateAmongSiblings(nodeId);
    }
    const stored = this.getMessage(id);
    if (!stored) {
      throw new Error("Message not found");
    }
    return stored;
  }

  listActivePath(conversationId: string): MessageRecord[] {
    const all = this.listMessages(conversationId);
    const path: MessageRecord[] = [];
    const seen = new Set<string>();
    let parentId: string | null = null;
    for (;;) {
      const children = all
        .filter((item) => item.parentId === parentId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      if (children.length === 0) {
        return path;
      }
      const next = children.find((item) => item.isActiveBranch) ?? children[0];
      if (!next || seen.has(next.id)) {
        return path;
      }
      seen.add(next.id);
      path.push(next);
      parentId = next.id;
    }
  }

  getBranchLabels(conversationId: string): Record<string, string> {
    const row = this.db
      .select()
      .from(settings)
      .where(eq(settings.key, `${BRANCH_LABELS_PREFIX}${conversationId}`))
      .get();
    if (!row) {
      return {};
    }
    const parsed: unknown = JSON.parse(row.value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const labels: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length > 0 && trimmed.length <= 80) {
          labels[key] = trimmed;
        }
      }
    }
    return labels;
  }

  setBranchLabel(conversationId: string, branchId: string, label: string): void {
    const conversation = this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .get();
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    const next = { ...this.getBranchLabels(conversationId) };
    const trimmed = label.trim();
    if (trimmed.length === 0) {
      delete next[branchId];
    } else {
      next[branchId] = trimmed.slice(0, 80);
    }
    const now = Date.now();
    const key = `${BRANCH_LABELS_PREFIX}${conversationId}`;
    this.db
      .insert(settings)
      .values({
        key,
        value: JSON.stringify(next),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: JSON.stringify(next), updatedAt: now },
      })
      .run();
  }

  updateMessage(id: string, content: string, status: MessageStatus): MessageRecord {
    const row = this.db.select().from(messages).where(eq(messages.id, id)).get();
    if (!row) {
      throw new Error("Message not found");
    }
    this.db
      .update(messages)
      .set({
        contentCipher: encryptUtf8(content, this.masterKey),
        status,
      })
      .where(eq(messages.id, id))
      .run();
    const updated = this.db.select().from(messages).where(eq(messages.id, id)).get();
    if (!updated) {
      throw new Error("Message not found");
    }
    return this.toMessage(updated, this.getReceipt(id));
  }

  deleteMessagesFrom(id: string): void {
    const target = this.db.select().from(messages).where(eq(messages.id, id)).get();
    if (!target) {
      throw new Error("Message not found");
    }
    const rows = this.listMessages(target.conversationId);
    const doomed: string[] = [];
    const walk = (nodeId: string): void => {
      for (const child of rows.filter((row) => row.parentId === nodeId)) {
        walk(child.id);
      }
      doomed.push(nodeId);
    };
    walk(id);
    for (const nodeId of doomed) {
      this.db.delete(messages).where(eq(messages.id, nodeId)).run();
    }
  }

  createReceipt(input: {
    messageId: string;
    provider: string | null;
    model: string | null;
    tokensIn: number | null;
    tokensOut: number | null;
    latencyMs: number | null;
    costUsd: string | null;
    errorCode: string | null;
    source?: "chat" | "import";
  }): ReceiptRecord {
    const message = this.db.select().from(messages).where(eq(messages.id, input.messageId)).get();
    if (!message) {
      throw new Error("Message not found");
    }
    const existing = this.getReceipt(input.messageId);
    const source = input.source ?? "chat";
    if (existing) {
      this.db
        .update(messageReceipts)
        .set({
          provider: input.provider,
          model: input.model,
          tokensIn: input.tokensIn,
          tokensOut: input.tokensOut,
          latencyMs: input.latencyMs,
          costUsd: input.costUsd,
          errorCode: input.errorCode,
          source,
        })
        .where(eq(messageReceipts.id, existing.id))
        .run();
      return {
        ...existing,
        provider: input.provider,
        model: input.model,
        tokensIn: input.tokensIn,
        tokensOut: input.tokensOut,
        latencyMs: input.latencyMs,
        costUsd: input.costUsd,
        errorCode: input.errorCode,
        source,
      };
    }
    const now = Date.now();
    const id = randomUUID();
    this.db
      .insert(messageReceipts)
      .values({
        id,
        messageId: input.messageId,
        provider: input.provider,
        model: input.model,
        tokensIn: input.tokensIn,
        tokensOut: input.tokensOut,
        latencyMs: input.latencyMs,
        costUsd: input.costUsd,
        errorCode: input.errorCode,
        source,
        createdAt: now,
      })
      .run();
    return {
      id,
      messageId: input.messageId,
      provider: input.provider,
      model: input.model,
      tokensIn: input.tokensIn,
      tokensOut: input.tokensOut,
      latencyMs: input.latencyMs,
      costUsd: input.costUsd,
      errorCode: input.errorCode,
      source,
      createdAt: iso(now),
    };
  }

  interruptOrphanStreams(): number {
    const rows = this.db.select().from(messages).where(eq(messages.status, "streaming")).all();
    const now = Date.now();
    for (const row of rows) {
      this.db.update(messages).set({ status: "interrupted" }).where(eq(messages.id, row.id)).run();
      const existing = this.getReceipt(row.id);
      if (existing) {
        if (!existing.errorCode) {
          this.db
            .update(messageReceipts)
            .set({ errorCode: "unknown" })
            .where(eq(messageReceipts.id, existing.id))
            .run();
        }
      } else {
        this.db
          .insert(messageReceipts)
          .values({
            id: randomUUID(),
            messageId: row.id,
            provider: null,
            model: null,
            tokensIn: null,
            tokensOut: null,
            latencyMs: null,
            costUsd: null,
            errorCode: "unknown",
            createdAt: now,
          })
          .run();
      }
    }
    return rows.length;
  }

  listProviders(): ProviderRecord[] {
    return this.db.select().from(providers).all();
  }

  getAppearance(): AppearanceRecord {
    const row = this.db.select().from(settings).where(eq(settings.key, APPEARANCE_KEY)).get();
    if (!row) {
      return { theme: "system", locale: "pt-BR" };
    }
    const parsed: unknown = JSON.parse(row.value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "theme" in parsed &&
      "locale" in parsed &&
      (parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "system") &&
      (parsed.locale === "pt-BR" || parsed.locale === "en")
    ) {
      return { theme: parsed.theme, locale: parsed.locale };
    }
    return { theme: "system", locale: "pt-BR" };
  }

  getAppPrefs(): AppPrefsRecord {
    const row = this.db.select().from(settings).where(eq(settings.key, APP_PREFS_KEY)).get();
    if (!row) {
      return { ...DEFAULT_APP_PREFS };
    }
    const parsed: unknown = JSON.parse(row.value);
    if (typeof parsed !== "object" || parsed === null) {
      return { ...DEFAULT_APP_PREFS };
    }
    const record = parsed as Record<string, unknown>;
    const status = record.lastUpdateStatus;
    return {
      onboardingComplete: record.onboardingComplete === true,
      crashReporterOptIn: record.crashReporterOptIn === true,
      lastUpdateCheckAt: typeof record.lastUpdateCheckAt === "string" ? record.lastUpdateCheckAt : null,
      lastUpdateStatus:
        typeof status === "string" && UPDATE_STATUSES.includes(status as AppPrefsRecord["lastUpdateStatus"])
          ? (status as AppPrefsRecord["lastUpdateStatus"])
          : DEFAULT_APP_PREFS.lastUpdateStatus,
      lastWizardTtftMs:
        typeof record.lastWizardTtftMs === "number" &&
        Number.isInteger(record.lastWizardTtftMs) &&
        record.lastWizardTtftMs >= 0
          ? record.lastWizardTtftMs
          : null,
    };
  }

  setAppPrefs(patch: {
    onboardingComplete?: boolean | undefined;
    crashReporterOptIn?: boolean | undefined;
    lastUpdateCheckAt?: string | null | undefined;
    lastUpdateStatus?: AppPrefsRecord["lastUpdateStatus"] | undefined;
    lastWizardTtftMs?: number | null | undefined;
  }): AppPrefsRecord {
    const current = this.getAppPrefs();
    const next: AppPrefsRecord = {
      onboardingComplete: patch.onboardingComplete ?? current.onboardingComplete,
      crashReporterOptIn: patch.crashReporterOptIn ?? current.crashReporterOptIn,
      lastUpdateCheckAt: patch.lastUpdateCheckAt === undefined ? current.lastUpdateCheckAt : patch.lastUpdateCheckAt,
      lastUpdateStatus: patch.lastUpdateStatus ?? current.lastUpdateStatus,
      lastWizardTtftMs: patch.lastWizardTtftMs === undefined ? current.lastWizardTtftMs : patch.lastWizardTtftMs,
    };
    const now = Date.now();
    this.db
      .insert(settings)
      .values({
        key: APP_PREFS_KEY,
        value: JSON.stringify(next),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: JSON.stringify(next), updatedAt: now },
      })
      .run();
    return next;
  }

  setAppearance(appearance: AppearanceRecord): void {
    const now = Date.now();
    this.db
      .insert(settings)
      .values({
        key: APPEARANCE_KEY,
        value: JSON.stringify(appearance),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: JSON.stringify(appearance), updatedAt: now },
      })
      .run();
  }

  getWorkspaceSession(): WorkspaceSessionRecord {
    const row = this.db.select().from(settings).where(eq(settings.key, SESSION_KEY)).get();
    if (!row) {
      return { ...DEFAULT_SESSION };
    }
    const parsed: unknown = JSON.parse(row.value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "projectId" in parsed &&
      "conversationId" in parsed &&
      "model" in parsed
    ) {
      const projectId = parsed.projectId;
      const conversationId = parsed.conversationId;
      const model = parsed.model;
      const projectOk = projectId === null || typeof projectId === "string";
      const conversationOk = conversationId === null || typeof conversationId === "string";
      if (projectOk && conversationOk && typeof model === "string" && model.length > 0) {
        const temperature =
          "temperature" in parsed && typeof parsed.temperature === "number" && Number.isFinite(parsed.temperature)
            ? Math.min(2, Math.max(0, parsed.temperature))
            : DEFAULT_SESSION.temperature;
        const maxTokens =
          "maxTokens" in parsed && parsed.maxTokens === null
            ? null
            : "maxTokens" in parsed && typeof parsed.maxTokens === "number" && Number.isInteger(parsed.maxTokens)
              ? parsed.maxTokens
              : DEFAULT_SESSION.maxTokens;
        const extraSystem =
          "extraSystem" in parsed && typeof parsed.extraSystem === "string"
            ? parsed.extraSystem.slice(0, 20_000)
            : DEFAULT_SESSION.extraSystem;
        return {
          projectId,
          conversationId,
          model,
          temperature,
          maxTokens,
          extraSystem,
          importedInbox: "importedInbox" in parsed && parsed.importedInbox === true,
        };
      }
    }
    return { ...DEFAULT_SESSION };
  }

  setWorkspaceSession(session: WorkspaceSessionRecord): void {
    const now = Date.now();
    this.db
      .insert(settings)
      .values({
        key: SESSION_KEY,
        value: JSON.stringify(session),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: JSON.stringify(session), updatedAt: now },
      })
      .run();
  }

  getCustomBaseUrl(keyId: string): string | null {
    const row = this.db
      .select()
      .from(settings)
      .where(eq(settings.key, `${CUSTOM_BASE_URL_PREFIX}${keyId}`))
      .get();
    if (!row || row.value.trim().length === 0) {
      return null;
    }
    return endpointUrlForDto(row.value);
  }

  setCustomBaseUrl(keyId: string, baseUrl: string): void {
    const sanitized = assertSafeEndpointUrl(baseUrl);
    const now = Date.now();
    this.db
      .insert(settings)
      .values({
        key: `${CUSTOM_BASE_URL_PREFIX}${keyId}`,
        value: sanitized,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: sanitized, updatedAt: now },
      })
      .run();
  }

  deleteCustomBaseUrl(keyId: string): void {
    this.db.delete(settings).where(eq(settings.key, `${CUSTOM_BASE_URL_PREFIX}${keyId}`)).run();
  }

  recordHealthSample(input: { providerSlug: string; ok: boolean; latencyMs: number | null }): HealthSampleRecord {
    const now = Date.now();
    const id = randomUUID();
    this.db
      .insert(healthSamples)
      .values({
        id,
        providerSlug: input.providerSlug,
        ok: input.ok ? 1 : 0,
        latencyMs: input.latencyMs,
        createdAt: now,
      })
      .run();
    return {
      id,
      providerSlug: input.providerSlug,
      ok: input.ok,
      latencyMs: input.latencyMs,
      createdAt: iso(now),
    };
  }

  listHealthSamples(providerSlug: string): HealthSampleRecord[] {
    return this.db
      .select()
      .from(healthSamples)
      .where(eq(healthSamples.providerSlug, providerSlug))
      .all()
      .map((row) => ({
        id: row.id,
        providerSlug: row.providerSlug,
        ok: row.ok === 1,
        latencyMs: row.latencyMs,
        createdAt: iso(row.createdAt),
      }));
  }

  listRecentHealthSamples(limit = 400): HealthSampleRecord[] {
    return this.db
      .select()
      .from(healthSamples)
      .orderBy(desc(healthSamples.createdAt))
      .limit(limit)
      .all()
      .map((row) => ({
        id: row.id,
        providerSlug: row.providerSlug,
        ok: row.ok === 1,
        latencyMs: row.latencyMs,
        createdAt: iso(row.createdAt),
      }));
  }

  listSpendCaps(): SpendCapRecord[] {
    return this.db
      .select()
      .from(spendCaps)
      .all()
      .map((row) => ({
        id: row.id,
        scope: row.scope,
        limitUsd: row.limitUsd,
        createdAt: iso(row.createdAt),
      }));
  }

  upsertSpendCap(scope: string, limitUsd: string | null): void {
    const existing = this.db.select().from(spendCaps).where(eq(spendCaps.scope, scope)).get();
    if (limitUsd === null) {
      if (existing) {
        this.db.delete(spendCaps).where(eq(spendCaps.id, existing.id)).run();
      }
      return;
    }
    const now = Date.now();
    if (existing) {
      this.db.update(spendCaps).set({ limitUsd }).where(eq(spendCaps.id, existing.id)).run();
      return;
    }
    this.db
      .insert(spendCaps)
      .values({
        id: randomUUID(),
        scope,
        limitUsd,
        createdAt: now,
      })
      .run();
  }

  sumReceiptCostUsd(filter: {
    conversationId?: string | null;
    projectId?: string | null;
    sinceMs?: number;
  }): string {
    const clauses = [];
    if (filter.sinceMs !== undefined) {
      clauses.push(gte(messageReceipts.createdAt, filter.sinceMs));
    }
    if (filter.conversationId) {
      clauses.push(eq(messages.conversationId, filter.conversationId));
    }
    if (filter.projectId) {
      clauses.push(eq(conversations.projectId, filter.projectId));
    }
    const query = this.db
      .select({
        costUsd: messageReceipts.costUsd,
      })
      .from(messageReceipts)
      .innerJoin(messages, eq(messages.id, messageReceipts.messageId))
      .innerJoin(conversations, eq(conversations.id, messages.conversationId));
    const rows = clauses.length > 0 ? query.where(and(...clauses)).all() : query.all();
    let micros = 0;
    for (const row of rows) {
      micros += parseUsdMicros(row.costUsd);
    }
    return microsToUsdText(micros);
  }

  listSpendCapOverrides(): SpendCapOverrideRecord[] {
    const row = this.db.select().from(settings).where(eq(settings.key, SPEND_CAP_OVERRIDES_KEY)).get();
    if (!row) {
      return [];
    }
    try {
      const parsed: unknown = JSON.parse(row.value);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((item): item is SpendCapOverrideRecord => {
        if (typeof item !== "object" || item === null) {
          return false;
        }
        const record = item as Partial<SpendCapOverrideRecord>;
        return (
          typeof record.at === "string" &&
          typeof record.scope === "string" &&
          typeof record.limitUsd === "string" &&
          (record.estimatedUsd === null || typeof record.estimatedUsd === "string") &&
          typeof record.conversationId === "string" &&
          typeof record.model === "string" &&
          typeof record.provider === "string"
        );
      });
    } catch {
      return [];
    }
  }

  appendSpendCapOverride(entry: SpendCapOverrideRecord): void {
    const stripped: SpendCapOverrideRecord = {
      at: entry.at,
      scope: entry.scope,
      limitUsd: entry.limitUsd,
      estimatedUsd: entry.estimatedUsd,
      conversationId: entry.conversationId,
      model: entry.model,
      provider: entry.provider,
    };
    const next = [stripped, ...this.listSpendCapOverrides()].slice(0, 200);
    const now = Date.now();
    this.db
      .insert(settings)
      .values({
        key: SPEND_CAP_OVERRIDES_KEY,
        value: JSON.stringify(next),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: JSON.stringify(next), updatedAt: now },
      })
      .run();
  }

  async listProviderKeys(): Promise<ProviderKeyRecord[]> {
    const rows = this.db.select().from(providerKeys).all();
    const catalog = this.listProviders();
    return rows.map((row) => {
      const provider = catalog.find((item) => item.id === row.providerId);
      const slug = provider?.slug ?? "unknown";
      return {
        id: row.id,
        providerSlug: slug,
        label: row.label,
        maskedKey: maskListedKey(row.last4, slug),
        last4: row.last4,
        status: row.status === "invalid" ? "invalid" : "active",
        endpointUrl: slug === "custom" ? this.getCustomBaseUrl(row.id) : null,
        createdAt: iso(row.createdAt),
      };
    });
  }

  async getProviderSecret(id: string): Promise<ProviderSecretRecord | null> {
    const row = this.db.select().from(providerKeys).where(eq(providerKeys.id, id)).get();
    if (!row) {
      return null;
    }
    const provider = this.db.select().from(providers).where(eq(providers.id, row.providerId)).get();
    const secret = await this.secrets.getPassword(row.keytarAccount);
    if (!secret || !provider) {
      return null;
    }
    return { id: row.id, providerSlug: provider.slug, secret };
  }

  async saveProviderKey(input: {
    providerSlug: string;
    label: string;
    secret: string;
    baseUrl?: string | undefined;
  }): Promise<ProviderKeyRecord> {
    const provider = this.db
      .select()
      .from(providers)
      .where(eq(providers.slug, input.providerSlug))
      .get();
    if (!provider) {
      throw new Error("Unknown provider");
    }
    if (input.providerSlug === "custom" && (input.baseUrl === undefined || input.baseUrl.trim().length === 0)) {
      throw new Error("Custom provider requires a base URL");
    }
    const id = randomUUID();
    const account = providerKeyAccount(id);
    const last4 = last4OfSecret(input.secret);
    const now = Date.now();
    try {
      await this.secrets.setPassword(account, input.secret);
      this.db
        .insert(providerKeys)
        .values({
          id,
          providerId: provider.id,
          label: input.label,
          keytarAccount: account,
          last4,
          status: "active",
          createdAt: now,
        })
        .run();
      if (input.providerSlug === "custom" && input.baseUrl !== undefined) {
        this.setCustomBaseUrl(id, input.baseUrl);
      }
    } catch (error) {
      await this.secrets.deletePassword(account);
      throw error;
    }
    return {
      id,
      providerSlug: provider.slug,
      label: input.label,
      maskedKey: maskSecret(input.secret),
      last4,
      status: "active",
      endpointUrl: input.providerSlug === "custom" ? this.getCustomBaseUrl(id) : null,
      createdAt: iso(now),
    };
  }

  private parsePacketOrigin(raw: string): {
    source: "compile" | "import";
    projectLabel: string;
    conversationLabel: string;
  } {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return { source: "compile", projectLabel: "", conversationLabel: "" };
      }
      const record = parsed as Record<string, unknown>;
      const source = record.source === "import" ? "import" : "compile";
      const projectLabel = typeof record.projectLabel === "string" ? record.projectLabel.slice(0, 200) : "";
      const conversationLabel =
        typeof record.conversationLabel === "string" ? record.conversationLabel.slice(0, 200) : "";
      return { source, projectLabel, conversationLabel };
    } catch {
      return { source: "compile", projectLabel: "", conversationLabel: "" };
    }
  }

  private toContextPacket(
    row: typeof contextPackets.$inferSelect,
    payloadJson: string | null,
  ): ContextPacketRecord | ContextPacketStored {
    const base: ContextPacketRecord = {
      id: row.id,
      projectId: row.projectId,
      tokenEstimate: row.tokenEstimate,
      privacyMode: row.privacyMode === "strict" ? "strict" : "standard",
      origin: this.parsePacketOrigin(row.origin),
      version: row.version,
      createdAt: iso(row.createdAt),
    };
    if (payloadJson === null) {
      return base;
    }
    return { ...base, payloadJson };
  }

  listContextPackets(projectId: string | null): ContextPacketRecord[] {
    const rows =
      projectId === null
        ? this.db.select().from(contextPackets).where(isNull(contextPackets.projectId)).all()
        : this.db.select().from(contextPackets).where(eq(contextPackets.projectId, projectId)).all();
    return rows
      .map((row) => this.toContextPacket(row, null) as ContextPacketRecord)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getContextPacket(id: string): ContextPacketStored | null {
    const row = this.db.select().from(contextPackets).where(eq(contextPackets.id, id)).get();
    if (!row) {
      return null;
    }
    return this.toContextPacket(row, decryptUtf8(row.payloadCipher, this.masterKey)) as ContextPacketStored;
  }

  createContextPacket(input: {
    projectId: string | null;
    privacyMode: "standard" | "strict";
    origin: { source: "compile" | "import"; projectLabel: string; conversationLabel: string };
    tokenEstimate: number;
    payloadJson: string;
  }): ContextPacketStored {
    if (input.projectId) {
      const project = this.getProject(input.projectId);
      if (!project) {
        throw new Error("Project not found");
      }
    }
    const now = Date.now();
    const id = randomUUID();
    this.db
      .insert(contextPackets)
      .values({
        id,
        projectId: input.projectId,
        payloadCipher: encryptUtf8(input.payloadJson, this.masterKey),
        tokenEstimate: input.tokenEstimate,
        createdAt: now,
        privacyMode: input.privacyMode,
        origin: JSON.stringify(input.origin),
        version: 1,
      })
      .run();
    const stored = this.getContextPacket(id);
    if (!stored) {
      throw new Error("Packet not found");
    }
    return stored;
  }

  applyContextPacket(conversationId: string, packetId: string): ConversationRecord {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    const packet = this.getContextPacket(packetId);
    if (!packet) {
      throw new Error("Packet not found");
    }
    if (packet.projectId !== conversation.projectId) {
      throw new Error("Packet belongs to another project");
    }
    const now = Date.now();
    this.db
      .update(conversations)
      .set({ activePacketId: packetId, packetAppliedAt: now, updatedAt: now })
      .where(eq(conversations.id, conversationId))
      .run();
    const updated = this.getConversation(conversationId);
    if (!updated) {
      throw new Error("Conversation not found");
    }
    return updated;
  }

  clearContextPacket(conversationId: string): ConversationRecord {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    const now = Date.now();
    this.db
      .update(conversations)
      .set({ activePacketId: null, packetAppliedAt: null, updatedAt: now })
      .where(eq(conversations.id, conversationId))
      .run();
    const updated = this.getConversation(conversationId);
    if (!updated) {
      throw new Error("Conversation not found");
    }
    return updated;
  }

  createProjectFile(input: {
    projectId: string | null;
    name: string;
    kind: string;
    mime: string;
    byteSize: number;
    tokenEstimate: number;
    extract: string;
    imageJson?: string | null;
    truncated: boolean;
  }): ProjectFileRecord {
    if (input.projectId) {
      const project = this.getProject(input.projectId);
      if (!project) {
        throw new Error("Project not found");
      }
    }
    const id = randomUUID();
    const now = Date.now();
    this.db
      .insert(projectFiles)
      .values({
        id,
        projectId: input.projectId,
        name: input.name.slice(0, 260),
        kind: input.kind,
        mime: input.mime,
        byteSize: input.byteSize,
        tokenEstimate: input.tokenEstimate,
        extractCipher: encryptUtf8(input.extract, this.masterKey),
        imageCipher:
          input.imageJson !== undefined && input.imageJson !== null
            ? encryptUtf8(input.imageJson, this.masterKey)
            : null,
        truncated: input.truncated ? 1 : 0,
        createdAt: now,
      })
      .run();
    const created = this.getProjectFile(id);
    if (!created) {
      throw new Error("File not found");
    }
    return created;
  }

  getProjectFile(id: string): ProjectFileRecord | null {
    const row = this.db.select().from(projectFiles).where(eq(projectFiles.id, id)).get();
    if (!row) {
      return null;
    }
    return this.toProjectFile(row);
  }

  listProjectFiles(projectId: string | null): ProjectFileRecord[] {
    const rows =
      projectId === null
        ? this.db.select().from(projectFiles).where(isNull(projectFiles.projectId)).all()
        : this.db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId)).all();
    return rows
      .map((row) => this.toProjectFile(row))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  removeProjectFile(id: string): void {
    this.db.delete(projectFiles).where(eq(projectFiles.id, id)).run();
  }

  private toProjectFile(row: typeof projectFiles.$inferSelect): ProjectFileRecord {
    return {
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      kind: row.kind,
      mime: row.mime,
      byteSize: row.byteSize,
      tokenEstimate: row.tokenEstimate,
      extract: decryptUtf8(row.extractCipher, this.masterKey),
      imageJson: row.imageCipher ? decryptUtf8(row.imageCipher, this.masterKey) : null,
      truncated: row.truncated === 1,
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }

  setMessagePinned(id: string, pinned: boolean): MessageRecord {
    const row = this.db.select().from(messages).where(eq(messages.id, id)).get();
    if (!row) {
      throw new Error("Message not found");
    }
    this.db.update(messages).set({ pinned: pinned ? 1 : 0 }).where(eq(messages.id, id)).run();
    const updated = this.getMessage(id);
    if (!updated) {
      throw new Error("Message not found");
    }
    return updated;
  }

  createProjectMemory(input: {
    projectId: string;
    title: string;
    body: string;
    source: "manual" | "suggested";
  }): ProjectMemoryRecord {
    if (!this.getProject(input.projectId)) {
      throw new Error("Project not found");
    }
    const id = randomUUID();
    const now = Date.now();
    this.db
      .insert(projectMemories)
      .values({
        id,
        projectId: input.projectId,
        titleCipher: encryptUtf8(input.title.slice(0, 120), this.masterKey),
        bodyCipher: encryptUtf8(input.body.slice(0, 4_000), this.masterKey),
        source: input.source,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const created = this.getProjectMemory(id);
    if (!created) {
      throw new Error("Memory not found");
    }
    return created;
  }

  getProjectMemory(id: string): ProjectMemoryRecord | null {
    const row = this.db.select().from(projectMemories).where(eq(projectMemories.id, id)).get();
    return row ? this.toProjectMemory(row) : null;
  }

  listProjectMemories(projectId: string): ProjectMemoryRecord[] {
    return this.db
      .select()
      .from(projectMemories)
      .where(eq(projectMemories.projectId, projectId))
      .all()
      .map((row) => this.toProjectMemory(row))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  updateProjectMemory(id: string, patch: { title?: string; body?: string }): ProjectMemoryRecord {
    const existing = this.getProjectMemory(id);
    if (!existing) {
      throw new Error("Memory not found");
    }
    this.db
      .update(projectMemories)
      .set({
        titleCipher: encryptUtf8((patch.title ?? existing.title).slice(0, 120), this.masterKey),
        bodyCipher: encryptUtf8((patch.body ?? existing.body).slice(0, 4_000), this.masterKey),
        updatedAt: Date.now(),
      })
      .where(eq(projectMemories.id, id))
      .run();
    const updated = this.getProjectMemory(id);
    if (!updated) {
      throw new Error("Memory not found");
    }
    return updated;
  }

  removeProjectMemory(id: string): void {
    this.db.delete(projectMemories).where(eq(projectMemories.id, id)).run();
  }

  getMemoryOptOut(projectId: string): boolean {
    const row = this.db
      .select()
      .from(settings)
      .where(eq(settings.key, `${MEMORY_OPT_OUT_PREFIX}${projectId}`))
      .get();
    return row?.value === "1";
  }

  setMemoryOptOut(projectId: string, optedOut: boolean): void {
    const key = `${MEMORY_OPT_OUT_PREFIX}${projectId}`;
    const now = Date.now();
    if (!optedOut) {
      this.db.delete(settings).where(eq(settings.key, key)).run();
      return;
    }
    this.db
      .insert(settings)
      .values({ key, value: "1", updatedAt: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: "1", updatedAt: now },
      })
      .run();
  }

  ensureFactoryPrompts(
    items: readonly { factoryId: string; folder: PromptFolder; title: string; body: string }[],
  ): void {
    const seeded = this.db.select().from(settings).where(eq(settings.key, PROMPT_FACTORY_SEEDED_KEY)).get();
    if (seeded?.value === "1") {
      return;
    }
    for (const item of items) {
      const existing = this.db.select().from(prompts).where(eq(prompts.factoryId, item.factoryId)).get();
      if (existing) {
        continue;
      }
      this.createPrompt({
        folder: item.folder,
        title: item.title,
        body: item.body,
        factoryId: item.factoryId,
      });
    }
    const now = Date.now();
    this.db
      .insert(settings)
      .values({ key: PROMPT_FACTORY_SEEDED_KEY, value: "1", updatedAt: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: "1", updatedAt: now },
      })
      .run();
  }

  createPrompt(input: {
    folder: PromptFolder;
    title: string;
    body: string;
    factoryId?: string | null;
  }): PromptRecord {
    const id = randomUUID();
    const now = Date.now();
    this.db
      .insert(prompts)
      .values({
        id,
        folder: input.folder,
        titleCipher: encryptUtf8(input.title.slice(0, 120), this.masterKey),
        bodyCipher: encryptUtf8(input.body.slice(0, 16_000), this.masterKey),
        factoryId: input.factoryId ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const created = this.getPrompt(id);
    if (!created) {
      throw new Error("Prompt not found");
    }
    return created;
  }

  getPrompt(id: string): PromptRecord | null {
    const row = this.db.select().from(prompts).where(eq(prompts.id, id)).get();
    return row ? this.toPrompt(row) : null;
  }

  listPrompts(): PromptRecord[] {
    return this.db
      .select()
      .from(prompts)
      .all()
      .map((row) => this.toPrompt(row))
      .sort((a, b) => a.folder.localeCompare(b.folder) || a.title.localeCompare(b.title));
  }

  updatePrompt(
    id: string,
    patch: { folder?: PromptFolder; title?: string; body?: string },
  ): PromptRecord {
    const existing = this.getPrompt(id);
    if (!existing) {
      throw new Error("Prompt not found");
    }
    this.db
      .update(prompts)
      .set({
        folder: patch.folder ?? existing.folder,
        titleCipher: encryptUtf8((patch.title ?? existing.title).slice(0, 120), this.masterKey),
        bodyCipher: encryptUtf8((patch.body ?? existing.body).slice(0, 16_000), this.masterKey),
        updatedAt: Date.now(),
      })
      .where(eq(prompts.id, id))
      .run();
    const updated = this.getPrompt(id);
    if (!updated) {
      throw new Error("Prompt not found");
    }
    return updated;
  }

  removePrompt(id: string): void {
    this.db.delete(prompts).where(eq(prompts.id, id)).run();
  }

  createArtifact(input: {
    conversationId: string;
    familyId?: string;
    sourceMessageId?: string | null;
    kind: ArtifactKind;
    title: string;
    body: string;
    language?: string | null;
    pinned?: boolean;
    version?: number;
  }): ArtifactRecord {
    const familyId = input.familyId ?? randomUUID();
    const existing = this.listArtifactsByFamily(familyId);
    const version =
      input.version ??
      (existing.length === 0 ? 1 : Math.max(...existing.map((item) => item.version)) + 1);
    const pinned = input.pinned ?? existing[0]?.pinned ?? false;
    const id = randomUUID();
    const now = Date.now();
    this.db
      .insert(artifacts)
      .values({
        id,
        conversationId: input.conversationId,
        familyId,
        sourceMessageId: input.sourceMessageId ?? null,
        kind: input.kind,
        titleCipher: encryptUtf8(input.title.slice(0, 120), this.masterKey),
        bodyCipher: encryptUtf8(input.body.slice(0, 100_000), this.masterKey),
        language: input.language ?? null,
        version,
        pinned: pinned ? 1 : 0,
        createdAt: now,
      })
      .run();
    const created = this.getArtifact(id);
    if (!created) {
      throw new Error("Artifact not found");
    }
    return created;
  }

  getArtifact(id: string): ArtifactRecord | null {
    const row = this.db.select().from(artifacts).where(eq(artifacts.id, id)).get();
    return row ? this.toArtifact(row) : null;
  }

  listArtifacts(conversationId: string): ArtifactRecord[] {
    return this.db
      .select()
      .from(artifacts)
      .where(eq(artifacts.conversationId, conversationId))
      .all()
      .map((row) => this.toArtifact(row))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.version - a.version);
  }

  listArtifactsByFamily(familyId: string): ArtifactRecord[] {
    return this.db
      .select()
      .from(artifacts)
      .where(eq(artifacts.familyId, familyId))
      .all()
      .map((row) => this.toArtifact(row))
      .sort((a, b) => a.version - b.version);
  }

  listArtifactsByMessage(messageId: string): ArtifactRecord[] {
    return this.db
      .select()
      .from(artifacts)
      .where(eq(artifacts.sourceMessageId, messageId))
      .all()
      .map((row) => this.toArtifact(row))
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.version - b.version);
  }

  setArtifactFamilyPinned(familyId: string, pinned: boolean): ArtifactRecord[] {
    this.db
      .update(artifacts)
      .set({ pinned: pinned ? 1 : 0 })
      .where(eq(artifacts.familyId, familyId))
      .run();
    return this.listArtifactsByFamily(familyId);
  }

  replaceFileChunks(
    fileId: string,
    projectId: string | null,
    chunks: { text: string; embedding: number[]; tokenEstimate: number }[],
  ): void {
    this.db.delete(fileChunks).where(eq(fileChunks.fileId, fileId)).run();
    const now = Date.now();
    chunks.forEach((chunk, index) => {
      this.db
        .insert(fileChunks)
        .values({
          id: randomUUID(),
          fileId,
          projectId,
          chunkIndex: index,
          textCipher: encryptUtf8(chunk.text, this.masterKey),
          embeddingCipher: encryptUtf8(JSON.stringify(chunk.embedding), this.masterKey),
          tokenEstimate: chunk.tokenEstimate,
          createdAt: now,
        })
        .run();
    });
  }

  listFileChunks(projectId: string): FileChunkRecord[] {
    const rows = this.db.select().from(fileChunks).where(eq(fileChunks.projectId, projectId)).all();
    return rows.map((row) => this.toFileChunk(row));
  }

  upsertConversationWorkspace(
    conversationId: string,
    summary: string,
    decisions: string[],
  ): ConversationWorkspaceRecord {
    if (!this.getConversation(conversationId)) {
      throw new Error("Conversation not found");
    }
    const now = Date.now();
    this.db
      .insert(conversationWorkspace)
      .values({
        conversationId,
        summaryCipher: encryptUtf8(summary.slice(0, 4_000), this.masterKey),
        decisionsCipher: encryptUtf8(JSON.stringify(decisions.slice(0, 20)), this.masterKey),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: conversationWorkspace.conversationId,
        set: {
          summaryCipher: encryptUtf8(summary.slice(0, 4_000), this.masterKey),
          decisionsCipher: encryptUtf8(JSON.stringify(decisions.slice(0, 20)), this.masterKey),
          updatedAt: now,
        },
      })
      .run();
    const stored = this.getConversationWorkspace(conversationId);
    if (!stored) {
      throw new Error("Workspace not found");
    }
    return stored;
  }

  getConversationWorkspace(conversationId: string): ConversationWorkspaceRecord | null {
    const row = this.db
      .select()
      .from(conversationWorkspace)
      .where(eq(conversationWorkspace.conversationId, conversationId))
      .get();
    if (!row) {
      return null;
    }
    let decisions: string[] = [];
    try {
      const parsed: unknown = JSON.parse(decryptUtf8(row.decisionsCipher, this.masterKey));
      if (Array.isArray(parsed)) {
        decisions = parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      decisions = [];
    }
    return {
      conversationId: row.conversationId,
      summary: decryptUtf8(row.summaryCipher, this.masterKey),
      decisions,
      updatedAt: iso(row.updatedAt),
    };
  }

  listConversationTasks(conversationId: string): ConversationTaskRecord[] {
    return this.db
      .select()
      .from(conversationTasks)
      .where(eq(conversationTasks.conversationId, conversationId))
      .all()
      .map((row) => this.toConversationTask(row))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  createConversationTask(conversationId: string, title: string): ConversationTaskRecord {
    if (!this.getConversation(conversationId)) {
      throw new Error("Conversation not found");
    }
    const id = randomUUID();
    const now = Date.now();
    this.db
      .insert(conversationTasks)
      .values({
        id,
        conversationId,
        titleCipher: encryptUtf8(title.slice(0, 240), this.masterKey),
        done: 0,
        createdAt: now,
      })
      .run();
    return {
      id,
      conversationId,
      title: title.slice(0, 240),
      done: false,
      createdAt: iso(now),
    };
  }

  setConversationTaskDone(id: string, done: boolean): ConversationTaskRecord {
    const row = this.db.select().from(conversationTasks).where(eq(conversationTasks.id, id)).get();
    if (!row) {
      throw new Error("Task not found");
    }
    this.db.update(conversationTasks).set({ done: done ? 1 : 0 }).where(eq(conversationTasks.id, id)).run();
    const updated = this.db.select().from(conversationTasks).where(eq(conversationTasks.id, id)).get();
    if (!updated) {
      throw new Error("Task not found");
    }
    return this.toConversationTask(updated);
  }

  removeConversationTask(id: string): void {
    this.db.delete(conversationTasks).where(eq(conversationTasks.id, id)).run();
  }

  duplicateConversation(id: string): ConversationRecord {
    const source = this.getConversation(id);
    if (!source) {
      throw new Error("Conversation not found");
    }
    const copy = this.createConversation(source.projectId, `Copy of ${source.title}`);
    const rows = this.db.select().from(messages).where(eq(messages.conversationId, id)).all();
    const idMap = new Map<string, string>();
    const branchMap = new Map<string, string>();
    for (const row of rows) {
      idMap.set(row.id, randomUUID());
      if (!branchMap.has(row.branchId)) {
        branchMap.set(row.branchId, randomUUID());
      }
    }
    for (const row of rows) {
      const nextId = idMap.get(row.id);
      const nextBranch = branchMap.get(row.branchId);
      if (!nextId || !nextBranch) {
        continue;
      }
      this.db
        .insert(messages)
        .values({
          id: nextId,
          conversationId: copy.id,
          parentId: row.parentId ? (idMap.get(row.parentId) ?? null) : null,
          branchId: nextBranch,
          isActiveBranch: row.isActiveBranch,
          role: row.role,
          contentCipher: encryptUtf8(decryptUtf8(row.contentCipher, this.masterKey), this.masterKey),
          status: row.status,
          createdAt: row.createdAt,
          pinned: row.pinned,
        })
        .run();
    }
    const workspace = this.getConversationWorkspace(id);
    if (workspace) {
      this.upsertConversationWorkspace(copy.id, workspace.summary, workspace.decisions);
    }
    for (const task of this.listConversationTasks(id)) {
      const cloned = this.createConversationTask(copy.id, task.title);
      if (task.done) {
        this.setConversationTaskDone(cloned.id, true);
      }
    }
    const familyMap = new Map<string, string>();
    for (const artifact of this.listArtifacts(id)) {
      let nextFamily = familyMap.get(artifact.familyId);
      if (!nextFamily) {
        nextFamily = randomUUID();
        familyMap.set(artifact.familyId, nextFamily);
      }
      this.createArtifact({
        conversationId: copy.id,
        familyId: nextFamily,
        sourceMessageId: artifact.sourceMessageId ? (idMap.get(artifact.sourceMessageId) ?? null) : null,
        kind: artifact.kind,
        title: artifact.title,
        body: artifact.body,
        language: artifact.language,
        pinned: artifact.pinned,
        version: artifact.version,
      });
    }
    const created = this.getConversation(copy.id);
    if (!created) {
      throw new Error("Conversation not found");
    }
    return created;
  }

  promoteConversationToProject(id: string): { project: ProjectRecord; conversation: ConversationRecord } {
    const source = this.getConversation(id);
    if (!source) {
      throw new Error("Conversation not found");
    }
    const project = this.createProject(source.title);
    return { project, conversation: this.moveConversation(id, project.id) };
  }

  private toProjectMemory(row: typeof projectMemories.$inferSelect): ProjectMemoryRecord {
    return {
      id: row.id,
      projectId: row.projectId,
      title: decryptUtf8(row.titleCipher, this.masterKey),
      body: decryptUtf8(row.bodyCipher, this.masterKey),
      source: row.source === "suggested" ? "suggested" : "manual",
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    };
  }

  private toFileChunk(row: typeof fileChunks.$inferSelect): FileChunkRecord {
    const file = this.getProjectFile(row.fileId);
    let embedding: number[] = [];
    try {
      const parsed: unknown = JSON.parse(decryptUtf8(row.embeddingCipher, this.masterKey));
      if (Array.isArray(parsed)) {
        embedding = parsed.filter((item): item is number => typeof item === "number");
      }
    } catch {
      embedding = [];
    }
    return {
      id: row.id,
      fileId: row.fileId,
      projectId: row.projectId,
      fileName: file?.name ?? "file",
      chunkIndex: row.chunkIndex,
      text: decryptUtf8(row.textCipher, this.masterKey),
      embedding,
      tokenEstimate: row.tokenEstimate,
    };
  }

  private toConversationTask(row: typeof conversationTasks.$inferSelect): ConversationTaskRecord {
    return {
      id: row.id,
      conversationId: row.conversationId,
      title: decryptUtf8(row.titleCipher, this.masterKey),
      done: row.done === 1,
      createdAt: iso(row.createdAt),
    };
  }

  private toPrompt(row: typeof prompts.$inferSelect): PromptRecord {
    const folder =
      row.folder === "development" || row.folder === "studies" || row.folder === "work"
        ? row.folder
        : "work";
    return {
      id: row.id,
      folder,
      title: decryptUtf8(row.titleCipher, this.masterKey),
      body: decryptUtf8(row.bodyCipher, this.masterKey),
      factoryId: row.factoryId ?? null,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    };
  }

  private toArtifact(row: typeof artifacts.$inferSelect): ArtifactRecord {
    const kind: ArtifactKind =
      row.kind === "mermaid" || row.kind === "html" || row.kind === "markdown" || row.kind === "code"
        ? row.kind
        : "markdown";
    return {
      id: row.id,
      conversationId: row.conversationId,
      familyId: row.familyId,
      sourceMessageId: row.sourceMessageId ?? null,
      kind,
      title: decryptUtf8(row.titleCipher, this.masterKey),
      body: decryptUtf8(row.bodyCipher, this.masterKey),
      language: row.language ?? null,
      version: row.version,
      pinned: row.pinned === 1,
      createdAt: iso(row.createdAt),
    };
  }

  async removeProviderKey(id: string): Promise<void> {
    const row = this.db.select().from(providerKeys).where(eq(providerKeys.id, id)).get();
    if (!row) {
      return;
    }
    this.db.delete(providerKeys).where(eq(providerKeys.id, id)).run();
    this.deleteCustomBaseUrl(id);
    await this.secrets.deletePassword(row.keytarAccount);
  }
}
