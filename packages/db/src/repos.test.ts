import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MemorySecretStore } from "@ai-hub/security";
import { applyMigrations } from "./migrate";
import { openHubDatabase } from "./open";

function openTestDb() {
  const masterKey = randomBytes(32);
  const secrets = new MemorySecretStore();
  return { hub: openHubDatabase({ path: ":memory:", masterKey, secretStore: secrets }), secrets };
}

function dumpAllText(sqlite: { prepare: (sql: string) => { all: () => unknown[] } }): string {
  const tables = sqlite
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)
    .all() as { name: string }[];
  const chunks: string[] = [];
  for (const table of tables) {
    const rows = sqlite.prepare(`SELECT * FROM "${table.name}"`).all();
    chunks.push(JSON.stringify(rows));
  }
  return chunks.join("\n");
}

describe("hub database", () => {
  it("creates project and conversation that round-trip decrypted", () => {
    const { hub } = openTestDb();
    const project = hub.repos.createProject("Alpha");
    const conversation = hub.repos.createConversation(project.id, "Kickoff");
    expect(hub.repos.listProjects().map((item) => item.name)).toEqual(["Alpha"]);
    expect(hub.repos.listConversations(project.id).map((item) => item.title)).toEqual(["Kickoff"]);
    expect(conversation.projectId).toBe(project.id);
    hub.close();
  });

  it("stores ciphertext, not plaintext names", () => {
    const { hub } = openTestDb();
    hub.repos.createProject("SecretProjectName");
    const dump = dumpAllText(hub.sqlite);
    expect(dump).not.toContain("SecretProjectName");
    expect(dump).toContain("name_cipher");
    hub.close();
  });

  it("accepts linear messages (null parent) and a branch (parent set)", () => {
    const { hub } = openTestDb();
    const project = hub.repos.createProject("Graph");
    const conversation = hub.repos.createConversation(project.id, "Thread");
    const root = hub.repos.createMessage({
      conversationId: conversation.id,
      role: "user",
      content: "hello",
      parentId: null,
      branchId: null,
    });
    const child = hub.repos.createMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "hi",
      parentId: root.id,
      branchId: null,
    });
    expect(root.parentId).toBeNull();
    expect(child.parentId).toBe(root.id);
    expect(child.branchId).toBe(root.branchId);
    const ftsCount = hub.sqlite.prepare(`SELECT count(*) AS n FROM messages_fts`).get() as { n: number };
    expect(ftsCount.n).toBe(0);
    hub.close();
  });

  it("never writes API secrets into SQLite", async () => {
    const { hub } = openTestDb();
    const secret = "sk-testfixtureNEVERSQLITE9999";
    const saved = await hub.repos.saveProviderKey({
      providerSlug: "openai",
      label: "work",
      secret,
    });
    expect(saved.maskedKey).toContain("…");
    expect(saved.maskedKey).not.toBe(secret);
    const dump = dumpAllText(hub.sqlite);
    expect(dump).not.toContain(secret);
    expect(dump).toContain(saved.last4);
    expect(dump).not.toMatch(/"secret"/i);
    const fts = hub.sqlite
      .prepare(`SELECT name FROM sqlite_master WHERE name = 'messages_fts'`)
      .get() as { name: string } | undefined;
    expect(fts?.name).toBe("messages_fts");
    const ftsCount = hub.sqlite.prepare(`SELECT count(*) AS n FROM messages_fts`).get() as { n: number };
    expect(ftsCount.n).toBe(0);
    hub.close();
  });

  it("persists appearance settings as plaintext JSON", () => {
    const { hub } = openTestDb();
    hub.repos.setAppearance({ theme: "dark", locale: "en" });
    expect(hub.repos.getAppearance()).toEqual({ theme: "dark", locale: "en" });
    hub.close();
  });

  it("survives close and reopen on a file", () => {
    const dir = mkdtempSync(join(tmpdir(), "ai-hub-db-"));
    const path = join(dir, "ai-hub.sqlite");
    const masterKey = randomBytes(32);
    const secrets = new MemorySecretStore();
    try {
      const first = openHubDatabase({ path, masterKey, secretStore: secrets });
      const project = first.repos.createProject("Persisted");
      first.repos.createConversation(project.id, "Kickoff");
      first.close();
      const second = openHubDatabase({ path, masterKey, secretStore: secrets });
      expect(second.repos.listProjects().map((item) => item.name)).toEqual(["Persisted"]);
      expect(second.repos.listConversations(project.id).map((item) => item.title)).toEqual(["Kickoff"]);
      applyMigrations(second.sqlite);
      expect(Number(second.sqlite.pragma("user_version", { simple: true }))).toBe(2);
      second.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("flushes streaming content and marks orphans interrupted with a receipt", () => {
    const { hub } = openTestDb();
    const project = hub.repos.createProject("Stream");
    const conversation = hub.repos.createConversation(project.id, "Thread");
    const user = hub.repos.createMessage({
      conversationId: conversation.id,
      role: "user",
      content: "hello",
      parentId: null,
      branchId: null,
    });
    const assistant = hub.repos.createMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "",
      parentId: user.id,
      branchId: null,
      status: "streaming",
    });
    hub.repos.updateMessage(assistant.id, "Hel", "streaming");
    hub.repos.createReceipt({
      messageId: assistant.id,
      provider: "openai",
      model: "gpt-4o-mini",
      tokensIn: null,
      tokensOut: null,
      latencyMs: null,
      costUsd: null,
      errorCode: null,
    });
    expect(hub.repos.interruptOrphanStreams()).toBe(1);
    const stored = hub.repos.getMessage(assistant.id);
    expect(stored?.content).toBe("Hel");
    expect(stored?.status).toBe("interrupted");
    expect(stored?.receipt?.errorCode).toBe("unknown");
    expect(stored?.receipt?.provider).toBe("openai");
    expect(stored?.receipt?.model).toBe("gpt-4o-mini");
    hub.close();
  });

  it("stores a receipt without the API secret", async () => {
    const { hub } = openTestDb();
    const secret = "sk-testfixtureNEVERSQLITE9999";
    await hub.repos.saveProviderKey({ providerSlug: "openai", label: "work", secret });
    const project = hub.repos.createProject("Receipts");
    const conversation = hub.repos.createConversation(project.id, "Thread");
    const message = hub.repos.createMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "hi",
      parentId: null,
      branchId: null,
    });
    hub.repos.createReceipt({
      messageId: message.id,
      provider: "openai",
      model: "gpt-4o-mini",
      tokensIn: 8,
      tokensOut: 2,
      latencyMs: 40,
      costUsd: "0.000001",
      errorCode: null,
    });
    const dump = dumpAllText(hub.sqlite);
    expect(dump).not.toContain(secret);
    expect(hub.repos.getReceipt(message.id)?.model).toBe("gpt-4o-mini");
    hub.close();
  });

  it("deletes a message and later siblings, keeping earlier ones", () => {
    const { hub } = openTestDb();
    const project = hub.repos.createProject("Linear");
    const conversation = hub.repos.createConversation(project.id, "Thread");
    const user = hub.repos.createMessage({
      conversationId: conversation.id,
      role: "user",
      content: "one",
      parentId: null,
      branchId: null,
    });
    const assistant = hub.repos.createMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "two",
      parentId: user.id,
      branchId: null,
    });
    const followUp = hub.repos.createMessage({
      conversationId: conversation.id,
      role: "user",
      content: "three",
      parentId: assistant.id,
      branchId: null,
    });
    hub.repos.createReceipt({
      messageId: assistant.id,
      provider: "openai",
      model: "gpt-4o-mini",
      tokensIn: 1,
      tokensOut: 1,
      latencyMs: 10,
      costUsd: "0.000001",
      errorCode: null,
    });
    hub.repos.deleteMessagesFrom(assistant.id);
    const remaining = hub.repos.listMessages(conversation.id);
    expect(remaining.map((item) => item.id)).toEqual([user.id]);
    expect(hub.repos.getMessage(followUp.id)).toBeNull();
    expect(hub.repos.getReceipt(assistant.id)).toBeNull();
    hub.close();
  });

  it("round-trips workspace session without a provider key id", () => {
    const { hub } = openTestDb();
    const project = hub.repos.createProject("Session");
    const conversation = hub.repos.createConversation(project.id, "Thread");
    hub.repos.setWorkspaceSession({
      projectId: project.id,
      conversationId: conversation.id,
      model: "gpt-4o",
    });
    expect(hub.repos.getWorkspaceSession()).toEqual({
      projectId: project.id,
      conversationId: conversation.id,
      model: "gpt-4o",
    });
    hub.close();
  });

  it("reads a provider secret from the store, not sqlite", async () => {
    const { hub } = openTestDb();
    const secret = "sk-testfixtureNEVERSQLITE9999";
    const saved = await hub.repos.saveProviderKey({
      providerSlug: "openai",
      label: "work",
      secret,
    });
    const loaded = await hub.repos.getProviderSecret(saved.id);
    expect(loaded?.secret).toBe(secret);
    expect(dumpAllText(hub.sqlite)).not.toContain(secret);
    hub.close();
  });
});
