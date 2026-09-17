import { randomUUID } from "node:crypto";
import { and, eq, isNull, ne } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  decryptUtf8,
  encryptUtf8,
  last4OfSecret,
  maskSecret,
  providerKeyAccount,
  type SecretStore,
} from "@ai-hub/security";
import {
  conversations,
  messageReceipts,
  messages,
  projects,
  providerKeys,
  providers,
  settings,
  type schema,
} from "./schema";

export type HubDrizzle = BetterSQLite3Database<typeof schema>;

export interface ProjectRecord {
  id: string;
  name: string;
  instructions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationRecord {
  id: string;
  projectId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
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
}

const APPEARANCE_KEY = "appearance";
const SESSION_KEY = "workspace-session";
const BRANCH_LABELS_PREFIX = "branch-labels:";
const DEFAULT_SESSION: WorkspaceSessionRecord = {
  projectId: null,
  conversationId: null,
  model: "gpt-4o-mini",
};

function iso(ms: number): string {
  return new Date(ms).toISOString();
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
      createdAt: iso(row.createdAt),
    };
  }

  private toProject(row: typeof projects.$inferSelect): ProjectRecord {
    return {
      id: row.id,
      name: decryptUtf8(row.nameCipher, this.masterKey),
      instructions: row.instructionsCipher
        ? decryptUtf8(row.instructionsCipher, this.masterKey)
        : null,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    };
  }

  private toConversation(row: typeof conversations.$inferSelect): ConversationRecord {
    return {
      id: row.id,
      projectId: row.projectId,
      title: decryptUtf8(row.titleCipher, this.masterKey),
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
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

  createProject(name: string): ProjectRecord {
    const now = Date.now();
    const id = randomUUID();
    this.db
      .insert(projects)
      .values({
        id,
        nameCipher: encryptUtf8(name, this.masterKey),
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return { id, name, instructions: null, createdAt: iso(now), updatedAt: iso(now) };
  }

  removeProject(id: string): void {
    this.db.delete(projects).where(eq(projects.id, id)).run();
  }

  listConversations(projectId: string | null): ConversationRecord[] {
    const rows =
      projectId === null
        ? this.db.select().from(conversations).all().filter((row) => row.projectId === null)
        : this.db.select().from(conversations).where(eq(conversations.projectId, projectId)).all();
    return rows
      .map((row) => this.toConversation(row))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getConversation(id: string): ConversationRecord | null {
    const row = this.db.select().from(conversations).where(eq(conversations.id, id)).get();
    return row ? this.toConversation(row) : null;
  }

  createConversation(projectId: string | null, title: string): ConversationRecord {
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
      })
      .run();
    return { id, projectId, title, createdAt: iso(now), updatedAt: iso(now) };
  }

  removeConversation(id: string): void {
    this.db.delete(conversations).where(eq(conversations.id, id)).run();
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

    const now = Date.now();
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
  }): ReceiptRecord {
    const message = this.db.select().from(messages).where(eq(messages.id, input.messageId)).get();
    if (!message) {
      throw new Error("Message not found");
    }
    const existing = this.getReceipt(input.messageId);
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
        return {
          projectId,
          conversationId,
          model,
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

  async listProviderKeys(): Promise<ProviderKeyRecord[]> {
    const rows = this.db.select().from(providerKeys).all();
    const catalog = this.listProviders();
    return rows.map((row) => {
      const provider = catalog.find((item) => item.id === row.providerId);
      const prefix = row.last4.length > 0 ? `sk-…${row.last4}` : "sk-…";
      return {
        id: row.id,
        providerSlug: provider?.slug ?? "unknown",
        label: row.label,
        maskedKey: prefix,
        last4: row.last4,
        status: row.status === "invalid" ? "invalid" : "active",
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
  }): Promise<ProviderKeyRecord> {
    const provider = this.db
      .select()
      .from(providers)
      .where(eq(providers.slug, input.providerSlug))
      .get();
    if (!provider) {
      throw new Error("Unknown provider");
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
      createdAt: iso(now),
    };
  }

  async removeProviderKey(id: string): Promise<void> {
    const row = this.db.select().from(providerKeys).where(eq(providerKeys.id, id)).get();
    if (!row) {
      return;
    }
    this.db.delete(providerKeys).where(eq(providerKeys.id, id)).run();
    await this.secrets.deletePassword(row.keytarAccount);
  }
}
