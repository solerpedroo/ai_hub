import { mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect, test, type ElectronApplication } from "@playwright/test";

const require = createRequire(import.meta.url);
const electronBinary = require("electron") as string;
const appRoot = path.join(fileURLToPath(new URL("..", import.meta.url)));

async function launchHub(env: Record<string, string> = {}): Promise<ElectronApplication> {
  return electron.launch({
    executablePath: electronBinary,
    args: [path.join(appRoot, "out/main/index.js")],
    cwd: appRoot,
    env: {
      ...process.env,
      AI_HUB_E2E: "1",
      NODE_ENV: "production",
      ...env,
    },
  });
}

test("lists factory skills and runs Code Review with a mentioned diff", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ai-hub-skill-"));
  const diff = path.join(dir, "diff.md");
  writeFileSync(diff, "--- a/app.ts\n+++ b/app.ts\n+export const ok = true;\n");
  const app = await launchHub({ AI_HUB_E2E_ATTACH_FILE: diff });
  try {
    const window = await app.firstWindow();
    await window.getByTestId("chat-composer").waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("files-attach").click();
    await expect(window.getByTestId("files-chip")).toContainText("diff.md", { timeout: 30_000 });
    await window.getByTestId("nav-skills").click();
    await expect(window.getByTestId("skills-view")).toBeVisible();
    await window.getByTestId("skill-folder-development").click();
    await expect(window.getByTestId("skill-item").filter({ hasText: "Code Review" })).toBeVisible();

    await window.getByTestId("nav-home").click();
    const composer = window.getByTestId("chat-composer");
    await composer.fill("/skill Code Review @file:diff");
    await window.getByTestId("chat-send").click();
    await expect(window.getByTestId("skill-run")).toBeVisible();
    await expect(window.getByTestId("skill-step").first()).toHaveAttribute("data-current", "true");
    const assistant = window.getByTestId("message-assistant");
    await expect(assistant).toHaveAttribute("data-status", "complete", { timeout: 30_000 });
    await expect(assistant).toContainText("Risks");
    await expect(assistant).toContainText("Suggestions");
    await expect(assistant).toContainText("gpt-4o-mini");
  } finally {
    await app.close();
  }
});
