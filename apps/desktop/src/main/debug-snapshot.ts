import type { DebugSnapshot } from "@ai-hub/shared";

let latest: DebugSnapshot | null = null;

export function recordDebugSnapshot(snapshot: DebugSnapshot): void {
  latest = snapshot;
}

export function getLatestDebugSnapshot(): DebugSnapshot | null {
  return latest;
}
