import { app } from "electron";

export function isE2eMode(): boolean {
  return process.env.AI_HUB_E2E === "1" && !app.isPackaged;
}
