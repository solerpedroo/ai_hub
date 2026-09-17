import { join } from "node:path";
import { app } from "electron";
import { openHubDatabase, type HubDatabase } from "@ai-hub/db";
import { loadOrCreateMasterKey } from "@ai-hub/security";
import { KeytarSecretStore } from "@ai-hub/security/keytar";

let hub: HubDatabase | null = null;

export async function bootPersistence(): Promise<HubDatabase> {
  if (hub) {
    return hub;
  }
  const store = new KeytarSecretStore();
  const masterKey = await loadOrCreateMasterKey(store);
  const dbPath = join(app.getPath("userData"), "ai-hub.sqlite");
  hub = openHubDatabase({ path: dbPath, masterKey, secretStore: store });
  hub.repos.interruptOrphanStreams();
  return hub;
}

export function getHubDatabase(): HubDatabase {
  if (!hub) {
    throw new Error("Database is not ready");
  }
  return hub;
}
