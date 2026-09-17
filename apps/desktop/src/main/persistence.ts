import { join } from "node:path";
import { app } from "electron";
import { openHubDatabase, type HubDatabase } from "@ai-hub/db";
import { loadOrCreateMasterKey, MemorySecretStore } from "@ai-hub/security";
import { KeytarSecretStore } from "@ai-hub/security/keytar";

let hub: HubDatabase | null = null;

function isE2e(): boolean {
  return process.env.AI_HUB_E2E === "1";
}

async function seedE2eWorkspace(database: HubDatabase): Promise<void> {
  const project = database.repos.createProject("E2E");
  const conversation = database.repos.createConversation(project.id, "Chat");
  await database.repos.saveProviderKey({
    providerSlug: "openai",
    label: "e2e",
    secret: "sk-e2efixtureABCDEFGH",
  });
  database.repos.setWorkspaceSession({
    projectId: project.id,
    conversationId: conversation.id,
    model: "gpt-4o-mini",
  });
}

export async function bootPersistence(): Promise<HubDatabase> {
  if (hub) {
    return hub;
  }
  const store = isE2e() ? new MemorySecretStore() : new KeytarSecretStore();
  const masterKey = await loadOrCreateMasterKey(store);
  const dbPath = join(app.getPath("userData"), "ai-hub.sqlite");
  hub = openHubDatabase({ path: dbPath, masterKey, secretStore: store });
  if (isE2e()) {
    await seedE2eWorkspace(hub);
  }
  hub.repos.interruptOrphanStreams();
  return hub;
}

export function getHubDatabase(): HubDatabase {
  if (!hub) {
    throw new Error("Database is not ready");
  }
  return hub;
}
