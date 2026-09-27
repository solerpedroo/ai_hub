import { scryptSync } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BrowserWindow, dialog } from "electron";
import type { SyncConfigDto, SyncConfigureInput, SyncPickRelayResult, SyncRunResult } from "@ai-hub/shared";
import { decryptUtf8, encryptUtf8, SYNC_KEY_ACCOUNT } from "@ai-hub/security";
import type { SyncSnapshot } from "@ai-hub/db";
import { getHubDatabase, getHubSecretStore } from "./persistence";
import { isE2eMode } from "./e2e-mode";

function relayPath(localPath: string | null): string | null {
  return localPath ?? (isE2eMode() ? process.env.AI_HUB_E2E_SYNC_RELAY ?? null : null);
}

function config(): SyncConfigDto {
  const local = getHubDatabase().repos.getSyncSettings();
  return { enabled: local.enabled, relayConfigured: relayPath(local.relayPath) !== null, phraseConfigured: false, categories: local.categories, lastSyncAt: local.lastSyncAt, conflictCount: getHubDatabase().repos.listSyncConflicts().length };
}

export async function getSyncConfig(): Promise<SyncConfigDto> {
  const next = config();
  next.phraseConfigured = (await getHubSecretStore().getPassword(SYNC_KEY_ACCOUNT)) !== null;
  return next;
}

export async function configureSync(input: SyncConfigureInput): Promise<SyncConfigDto> {
  if (input.pairingPhrase) {
    const key = scryptSync(input.pairingPhrase, "ai-hub-sync-v1", 32);
    await getHubSecretStore().setPassword(SYNC_KEY_ACCOUNT, key.toString("base64"));
  }
  getHubDatabase().repos.setSyncSettings({ enabled: input.enabled, categories: input.categories });
  return getSyncConfig();
}

export async function pickSyncRelay(sender: Electron.WebContents): Promise<SyncPickRelayResult> {
  const parent = BrowserWindow.fromWebContents(sender);
  const result = parent ? await dialog.showOpenDialog(parent, { properties: ["openDirectory", "createDirectory"] }) : await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
  if (result.canceled || !result.filePaths[0]) return { status: "cancelled", relayConfigured: getHubDatabase().repos.getSyncSettings().relayPath !== null };
  await mkdir(result.filePaths[0], { recursive: true });
  getHubDatabase().repos.setSyncSettings({ relayPath: result.filePaths[0] });
  return { status: "selected", relayConfigured: true };
}

export async function runSync(): Promise<SyncRunResult> {
  const local = getHubDatabase().repos.getSyncSettings();
  if (!local.enabled) return { status: "disabled", imported: 0, exported: 0, conflicts: 0, syncedAt: null };
  const encodedKey = await getHubSecretStore().getPassword(SYNC_KEY_ACCOUNT);
  const sharedRelay = relayPath(local.relayPath);
  if (!sharedRelay || !encodedKey) return { status: "not_configured", imported: 0, exported: 0, conflicts: 0, syncedAt: null };
  const key = Buffer.from(encodedKey, "base64");
  const relayFile = join(sharedRelay, "ai-hub-sync-v1.envelope");
  let imported = 0;
  let conflicts = 0;
  try {
    const encrypted = await readFile(relayFile, "utf8");
    const candidate: unknown = JSON.parse(decryptUtf8(encrypted, key));
    if (!candidate || typeof candidate !== "object" || (candidate as { version?: unknown }).version !== 1 || !Array.isArray((candidate as { projects?: unknown }).projects) || !Array.isArray((candidate as { conversations?: unknown }).conversations) || !Array.isArray((candidate as { messages?: unknown }).messages)) throw new Error("sync:invalid_envelope");
    const remote = candidate as SyncSnapshot;
    const safeRemote: SyncSnapshot = {
      ...remote,
      projects: local.categories.projects ? remote.projects : [],
      conversations: local.categories.conversations ? remote.conversations : [],
      messages: local.categories.conversations ? remote.messages : [],
      packets: local.categories.packets && Array.isArray(remote.packets) ? remote.packets : [],
      skills: local.categories.skills && Array.isArray(remote.skills) ? remote.skills : [],
      ...(local.categories.settings && remote.appearance ? { appearance: remote.appearance } : {}),
      ...(local.categories.settings && remote.appPrefs ? { appPrefs: remote.appPrefs } : {}),
    };
    const outcome = getHubDatabase().repos.importSyncSnapshot(safeRemote);
    imported = outcome.imported;
    conflicts = outcome.conflicts;
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "ENOENT")) throw error;
  }
  const current = getHubDatabase().repos.exportSyncSnapshot();
  const snapshot: SyncSnapshot = {
    ...current,
    projects: local.categories.projects ? current.projects : [],
    conversations: local.categories.conversations ? current.conversations : [],
    messages: local.categories.conversations ? current.messages : [],
    packets: local.categories.packets ? current.packets : [],
    skills: local.categories.skills ? current.skills : [],
    ...(local.categories.settings ? { appearance: current.appearance, appPrefs: current.appPrefs } : {}),
  };
  const temporary = `${relayFile}.tmp`;
  await writeFile(temporary, encryptUtf8(JSON.stringify(snapshot), key), { encoding: "utf8", mode: 0o600 });
  await rename(temporary, relayFile);
  const syncedAt = new Date().toISOString();
  getHubDatabase().repos.setSyncSettings({ lastSyncAt: syncedAt });
  return { status: "synced", imported, exported: snapshot.projects.length + snapshot.conversations.length + snapshot.messages.length, conflicts, syncedAt };
}
