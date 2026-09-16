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
      expect(Number(second.sqlite.pragma("user_version", { simple: true }))).toBe(1);
      second.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
