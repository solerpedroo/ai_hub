import { randomUUID, scryptSync } from "node:crypto";
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BrowserWindow, dialog } from "electron";
import { syncSnapshotSchema, type SyncConfigDto, type SyncConfigureInput, type SyncPickRelayResult, type SyncRunResult } from "@ai-hub/shared";
import { decryptUtf8, encryptUtf8, SYNC_KEY_ACCOUNT } from "@ai-hub/security";
import type { SyncSnapshot } from "@ai-hub/db";
import { getHubDatabase, getHubSecretStore } from "./persistence";
import { isE2eMode } from "./e2e-mode";

function relayPath(localPath: string | null): string | null {
  return localPath ?? (isE2eMode() ? process.env.AI_HUB_E2E_SYNC_RELAY ?? null : null);
}

const RELAY_LOCK_STALE_MS = 120_000;
const RELAY_LOCK_RETRY_MS = 200;
const RELAY_LOCK_ATTEMPTS = 50;

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireRelayLock(sharedRelay: string): Promise<() => Promise<void>> {
  const lockPath = join(sharedRelay, "ai-hub-sync-v1.lock");
  for (let attempt = 0; attempt < RELAY_LOCK_ATTEMPTS; attempt += 1) {
    try {
      const handle = await open(lockPath, "wx", 0o600);
      await handle.writeFile(`${process.pid}:${Date.now()}`, "utf8");
      await handle.close();
      return async () => { try { await unlink(lockPath); } catch (error) { if (!(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "ENOENT")) throw error; } };
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "EEXIST")) throw error;
      const lock = await stat(lockPath).catch(() => null);
      if (lock && Date.now() - lock.mtimeMs > RELAY_LOCK_STALE_MS) {
        await unlink(lockPath).catch(() => undefined);
        continue;
      }
      await pause(RELAY_LOCK_RETRY_MS);
    }
  }
  throw new Error("sync:relay_busy");
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
  await mkdir(sharedRelay, { recursive: true });
  const releaseRelayLock = await acquireRelayLock(sharedRelay);
  let imported = 0;
  let conflicts = 0;
  try {
    try {
      const encrypted = await readFile(relayFile, "utf8");
      const candidate: unknown = JSON.parse(decryptUtf8(encrypted, key));
      const remote = syncSnapshotSchema.parse(candidate) as SyncSnapshot;
      const safeRemote: SyncSnapshot = {
        ...remote,
        projects: local.categories.projects ? remote.projects : [],
        conversations: local.categories.conversations ? remote.conversations : [],
        messages: local.categories.conversations ? remote.messages : [],
        packets: local.categories.packets && Array.isArray(remote.packets) ? remote.packets : [],
        skills: local.categories.skills && Array.isArray(remote.skills) ? remote.skills : [],
        ...(local.categories.settings && remote.appearance ? { appearance: remote.appearance } : {}),
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
      ...(local.categories.settings ? { appearance: current.appearance } : {}),
    };
    const temporary = `${relayFile}.${randomUUID()}.tmp`;
    await writeFile(temporary, encryptUtf8(JSON.stringify(snapshot), key), { encoding: "utf8", mode: 0o600 });
    await rename(temporary, relayFile);
    const syncedAt = new Date().toISOString();
    getHubDatabase().repos.setSyncSettings({ lastSyncAt: syncedAt });
    return { status: "synced", imported, exported: snapshot.projects.length + snapshot.conversations.length + snapshot.messages.length, conflicts, syncedAt };
  } finally {
    await releaseRelayLock();
  }
}
