import { app } from "electron";
import { resolveUpdateCheckResult, type UpdateCheckResult } from "@ai-hub/shared";

export async function checkForAppUpdates(): Promise<UpdateCheckResult> {
  if (!app.isPackaged) {
    return resolveUpdateCheckResult({
      packaged: false,
      currentVersion: app.getVersion(),
      failed: false,
      remoteVersion: null,
    });
  }
  try {
    const { autoUpdater } = await import("electron-updater");
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    const result = await autoUpdater.checkForUpdates();
    return resolveUpdateCheckResult({
      packaged: true,
      currentVersion: app.getVersion(),
      failed: false,
      remoteVersion: result?.updateInfo.version ?? null,
    });
  } catch {
    return resolveUpdateCheckResult({
      packaged: true,
      currentVersion: app.getVersion(),
      failed: true,
      remoteVersion: null,
    });
  }
}
