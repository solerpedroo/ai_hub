import { randomBytes, randomUUID } from "node:crypto";
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
      expect(Number(second.sqlite.pragma("user_version", { simple: true }))).toBe(5);
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

  it("does not delete a later sibling when removing a subtree", () => {
    const { hub } = openTestDb();
    const project = hub.repos.createProject("GraphDelete");
    const conversation = hub.repos.createConversation(project.id, "Thread");
    const user = hub.repos.createMessage({
      conversationId: conversation.id,
      role: "user",
      content: "prompt",
      parentId: null,
      branchId: null,
    });
    const first = hub.repos.createMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "one",
      parentId: user.id,
      branchId: null,
    });
    const second = hub.repos.createMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "two",
      parentId: user.id,
      branchId: randomUUID(),
    });
    hub.repos.deleteMessagesFrom(first.id);
    const remaining = hub.repos.listMessages(conversation.id);
    expect(remaining.map((item) => item.id).sort()).toEqual([user.id, second.id].sort());
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
      temperature: 0.4,
      maxTokens: 256,
      extraSystem: "Be terse.",
    });
    expect(hub.repos.getWorkspaceSession()).toEqual({
      projectId: project.id,
      conversationId: conversation.id,
      model: "gpt-4o",
      temperature: 0.4,
      maxTokens: 256,
      extraSystem: "Be terse.",
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

  it("keeps three branches, switches the active sibling, and survives reopen", () => {
    const dir = mkdtempSync(join(tmpdir(), "ai-hub-branch-"));
    const path = join(dir, "ai-hub.sqlite");
    const masterKey = randomBytes(32);
    const secrets = new MemorySecretStore();
    try {
      const first = openHubDatabase({ path, masterKey, secretStore: secrets });
      const project = first.repos.createProject("Graph");
      const conversation = first.repos.createConversation(project.id, "Thread");
      const user = first.repos.createMessage({
        conversationId: conversation.id,
        role: "user",
        content: "prompt",
        parentId: null,
        branchId: null,
      });
      const a1 = first.repos.createMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: "one",
        parentId: user.id,
        branchId: null,
      });
      const a2 = first.repos.createMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: "two",
        parentId: user.id,
        branchId: randomUUID(),
      });
      const a3 = first.repos.createMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: "three",
        parentId: user.id,
        branchId: randomUUID(),
      });
      expect(first.repos.getMessage(a1.id)?.isActiveBranch).toBe(false);
      expect(first.repos.getMessage(a2.id)?.isActiveBranch).toBe(false);
      expect(first.repos.getMessage(a3.id)?.isActiveBranch).toBe(true);
      expect(first.repos.listActivePath(conversation.id).map((item) => item.id)).toEqual([
        user.id,
        a3.id,
      ]);
      first.repos.activatePathThrough(a1.id);
      expect(first.repos.listActivePath(conversation.id).map((item) => item.id)).toEqual([
        user.id,
        a1.id,
      ]);
      expect(first.repos.listMessages(conversation.id)).toHaveLength(4);
      first.repos.setBranchLabel(conversation.id, a2.branchId, "alt-b");
      first.close();

      const second = openHubDatabase({ path, masterKey, secretStore: secrets });
      expect(second.repos.listActivePath(conversation.id).map((item) => item.id)).toEqual([
        user.id,
        a1.id,
      ]);
      expect(second.repos.getMessage(a2.id)?.content).toBe("two");
      expect(second.repos.getMessage(a2.id)?.isActiveBranch).toBe(false);
      expect(second.repos.getBranchLabels(conversation.id)[a2.branchId]).toBe("alt-b");
      second.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("forks a user sibling without deleting the original prompt", () => {
    const { hub } = openTestDb();
    const project = hub.repos.createProject("Edit");
    const conversation = hub.repos.createConversation(project.id, "Thread");
    const user = hub.repos.createMessage({
      conversationId: conversation.id,
      role: "user",
      content: "original",
      parentId: null,
      branchId: null,
    });
    const assistant = hub.repos.createMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "reply",
      parentId: user.id,
      branchId: null,
    });
    const edited = hub.repos.createMessage({
      conversationId: conversation.id,
      role: "user",
      content: "edited",
      parentId: null,
      branchId: randomUUID(),
    });
    expect(hub.repos.getMessage(user.id)?.isActiveBranch).toBe(false);
    expect(edited.isActiveBranch).toBe(true);
    expect(hub.repos.getMessage(assistant.id)?.content).toBe("reply");
    expect(hub.repos.listActivePath(conversation.id).map((item) => item.id)).toEqual([edited.id]);
    hub.close();
  });

  it("seeds custom and OpenRouter providers and stores custom URL without the secret", async () => {
    const { hub } = openTestDb();
    const slugs = hub.repos.listProviders().map((item) => item.slug);
    expect(slugs).toEqual(expect.arrayContaining(["openai", "openrouter", "anthropic", "google", "groq", "custom"]));
    const secret = "sk-customfixtureNEVERSQLITE9999";
    const saved = await hub.repos.saveProviderKey({
      providerSlug: "custom",
      label: "local",
      secret,
      baseUrl: "http://127.0.0.1:8080/v1",
    });
    expect(saved.endpointUrl).toBe("http://127.0.0.1:8080/v1");
    expect(saved.maskedKey).not.toBe(secret);
    const dump = dumpAllText(hub.sqlite);
    expect(dump).not.toContain(secret);
    expect(dump).toContain("http://127.0.0.1:8080/v1");
    await expect(
      hub.repos.saveProviderKey({
        providerSlug: "custom",
        label: "bad",
        secret: "sk-customfixtureNEVERSQLITE9999",
        baseUrl: "https://user:embedded-secret@127.0.0.1/v1",
      }),
    ).rejects.toThrow("Invalid custom base URL");
    hub.close();
  });

  it("records a health sample without storing secrets", () => {
    const { hub } = openTestDb();
    const sample = hub.repos.recordHealthSample({
      providerSlug: "openrouter",
      ok: true,
      latencyMs: 42,
    });
    expect(sample.ok).toBe(true);
    expect(hub.repos.listHealthSamples("openrouter")).toHaveLength(1);
    const dump = dumpAllText(hub.sqlite);
    expect(dump).not.toMatch(/sk-/);
    hub.close();
  });

  it("stores three projects with instructions and finds an old message without filling FTS", () => {
    const { hub } = openTestDb();
    const alpha = hub.repos.createProject("Alpha", {
      color: "#2563eb",
      instructions: "Stay terse.",
      preferredModel: "gpt-4o-mini",
      preferredProvider: "openai",
    });
    hub.repos.createProject("Beta", { color: "#16a34a" });
    hub.repos.createProject("Gamma");
    expect(hub.repos.listProjects()).toHaveLength(3);
    expect(alpha.instructions).toBe("Stay terse.");
    expect(alpha.preferredProvider).toBe("openai");

    const inbox = hub.repos.createConversation(null, "Loose note");
    expect(inbox.projectId).toBeNull();
    expect(hub.repos.listConversations(null).map((item) => item.title)).toEqual(["Loose note"]);

    const conversation = hub.repos.createConversation(alpha.id, "Kickoff");
    hub.repos.createMessage({
      conversationId: conversation.id,
      role: "user",
      content: "remember the ancient needle phrase",
      parentId: null,
      branchId: null,
    });
    const tagged = hub.repos.setConversationTags(conversation.id, ["research", "mvp"]);
    expect(tagged.tags).toEqual(["mvp", "research"]);

    hub.repos.removeProject(alpha.id);
    expect(hub.repos.getConversation(conversation.id)?.projectId).toBeNull();

    const hits = hub.repos.searchWorkspace("ancient needle");
    expect(hits.some((hit) => hit.snippet.includes("ancient needle"))).toBe(true);
    const dump = dumpAllText(hub.sqlite);
    expect(dump).not.toContain("ancient needle phrase");
    const ftsCount = hub.sqlite.prepare(`SELECT count(*) AS n FROM messages_fts`).get() as { n: number };
    expect(ftsCount.n).toBe(0);
    hub.close();
  });

  it("redacts pasted secrets in search snippets", () => {
    const { hub } = openTestDb();
    const project = hub.repos.createProject("Vault");
    const conversation = hub.repos.createConversation(project.id, "Keys");
    hub.repos.createMessage({
      conversationId: conversation.id,
      role: "user",
      content: "my key is sk-testfixtureABCDEFGH never store it",
      parentId: null,
      branchId: null,
    });
    const hits = hub.repos.searchWorkspace("never store");
    expect(hits.length).toBeGreaterThan(0);
    expect(JSON.stringify(hits)).not.toContain("sk-testfixtureABCDEFGH");
    expect(hits[0]?.snippet).toContain("[REDACTED]");
    hub.close();
  });

  it("upserts spend caps by scope and sums receipt costs", () => {
    const { hub } = openTestDb();
    hub.repos.upsertSpendCap("request", "1.000000");
    hub.repos.upsertSpendCap("day", "5.000000");
    expect(hub.repos.listSpendCaps().map((item) => item.scope).sort()).toEqual(["day", "request"]);
    hub.repos.upsertSpendCap("request", null);
    expect(hub.repos.listSpendCaps().map((item) => item.scope)).toEqual(["day"]);
    const project = hub.repos.createProject("Spend");
    const conversation = hub.repos.createConversation(project.id, "Thread");
    const assistant = hub.repos.createMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "hi",
      parentId: null,
      branchId: null,
    });
    hub.repos.createReceipt({
      messageId: assistant.id,
      provider: "openai",
      model: "gpt-4o-mini",
      tokensIn: 10,
      tokensOut: 4,
      latencyMs: 20,
      costUsd: "0.250000",
      errorCode: null,
    });
    expect(hub.repos.sumReceiptCostUsd({ conversationId: conversation.id })).toBe("0.250000");
    expect(hub.repos.sumReceiptCostUsd({ projectId: project.id })).toBe("0.250000");
    expect(hub.repos.sumReceiptCostUsd({})).toBe("0.250000");
    hub.repos.appendSpendCapOverride({
      at: "2026-09-17T00:00:00.000Z",
      scope: "request",
      limitUsd: "0",
      estimatedUsd: "0.250000",
      conversationId: conversation.id,
      model: "gpt-4o-mini",
      provider: "openai",
    });
    expect(hub.repos.listSpendCapOverrides()).toHaveLength(1);
    hub.close();
  });
});
