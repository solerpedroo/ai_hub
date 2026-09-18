import type { UpdateCheckResult } from "./ipc-schemas";

export function resolveUpdateCheckResult(input: {
  packaged: boolean;
  currentVersion: string;
  failed: boolean;
  remoteVersion: string | null;
}): UpdateCheckResult {
  if (!input.packaged) {
    return { status: "skipped", version: null };
  }
  if (input.failed) {
    return { status: "unavailable", version: null };
  }
  if (input.remoteVersion !== null && input.remoteVersion !== input.currentVersion) {
    return { status: "available", version: input.remoteVersion };
  }
  return { status: "uptodate", version: input.currentVersion };
}
