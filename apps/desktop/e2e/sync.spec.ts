import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect, test, type ElectronApplication } from "@playwright/test";

const require = createRequire(import.meta.url);
const electronBinary = require("electron") as string;
const appRoot = path.join(fileURLToPath(new URL("..", import.meta.url)));

function launch(userData: string, relay: string): Promise<ElectronApplication> {
  return electron.launch({ executablePath: electronBinary, args: [path.join(appRoot, "out/main/index.js")], cwd: appRoot, env: { ...process.env, AI_HUB_E2E: "1", AI_HUB_E2E_USER_DATA: userData, AI_HUB_E2E_SYNC_RELAY: relay, NODE_ENV: "production" } });
}

test("syncs a conversation between isolated device profiles without provider keys", async () => {
  const relay = mkdtempSync(path.join(tmpdir(), "ai-hub-sync-relay-"));
  const firstData = mkdtempSync(path.join(tmpdir(), "ai-hub-sync-first-"));
  const secondData = mkdtempSync(path.join(tmpdir(), "ai-hub-sync-second-"));
  const phrase = "sync pairing phrase for e2e only";
  try {
    const first = await launch(firstData, relay);
    const firstWindow = await first.firstWindow();
    const created = await firstWindow.evaluate(async ({ phrase }) => {
      const project = await window.hub.projects.create({ name: "Cross-device project" });
      const conversation = await window.hub.conversations.create({ projectId: project.id, title: "Cross-device conversation" });
      await window.hub.messages.create({ conversationId: conversation.id, role: "user", content: "Message from device one", parentId: null, branchId: null });
      await window.hub.secrets.save({ providerSlug: "openai", label: "sync-source-only", secret: "sk-syncfixtureABCDEFGH" });
      await window.hub.sync.configure({ enabled: true, categories: { projects: true, conversations: true, settings: true, packets: true, skills: true }, pairingPhrase: phrase });
      await window.hub.sync.run();
      return { projectId: project.id, conversationId: conversation.id };
    }, { phrase });
    await first.close();
    const relayEnvelope = readFileSync(path.join(relay, "ai-hub-sync-v1.envelope"), "utf8");
    expect(relayEnvelope).not.toContain("Message from device one");
    expect(relayEnvelope).not.toContain("sync-source-only");

    const second = await launch(secondData, relay);
    const secondWindow = await second.firstWindow();
    const received = await secondWindow.evaluate(async ({ phrase, projectId, conversationId }) => {
      await window.hub.sync.configure({ enabled: true, categories: { projects: true, conversations: true, settings: true, packets: true, skills: true }, pairingPhrase: phrase });
      const result = await window.hub.sync.run();
      const project = (await window.hub.projects.list()).find((item) => item.id === projectId);
      const conversation = (await window.hub.conversations.list({ projectId })).find((item) => item.id === conversationId);
      const messages = conversation ? await window.hub.messages.list({ conversationId }) : [];
      const keys = await window.hub.secrets.list();
      return { result, project, conversation, messages, keys };
    }, { phrase, ...created });
    expect(received.result.status).toBe("synced");
    expect(received.project?.name).toBe("Cross-device project");
    expect(received.conversation?.title).toBe("Cross-device conversation");
    expect(received.messages[0]?.content).toBe("Message from device one");
    expect(received.keys.some((key) => key.label === "sync-source-only")).toBe(false);
    await second.close();
  } finally {
    for (const pathToRemove of [relay, firstData, secondData]) {
      try { rmSync(pathToRemove, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch { /* Windows may release Electron SQLite handles after process exit. */ }
    }
  }
});
