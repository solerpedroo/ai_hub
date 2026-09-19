import { mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect, test, type ElectronApplication } from "@playwright/test";

const require = createRequire(import.meta.url);
const electronBinary = require("electron") as string;
const appRoot = path.join(fileURLToPath(new URL("..", import.meta.url)));

async function launchHub(env: Record<string, string>): Promise<ElectronApplication> {
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

test("types @file:README.md and does not dump the file in the visible message", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ai-hub-mention-"));
  const readme = path.join(dir, "README.md");
  writeFileSync(readme, "# Secret dump body\nthis repo uses PostgreSQL\n");
  const app = await launchHub({ AI_HUB_E2E_ATTACH_FILE: readme });
  try {
    const window = await app.firstWindow();
    const composer = window.getByTestId("chat-composer");
    await composer.waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("files-attach").click();
    await expect(window.getByTestId("files-chip")).toContainText("README.md");
    await window.getByTestId("files-remove").click();
    await expect(window.getByTestId("files-chip")).toHaveCount(0);
    await composer.fill("@file:README.md o que este repo faz?");
    await composer.press("Enter");
    const user = window.getByTestId("message-user");
    await expect(user).toContainText("o que este repo faz?");
    await expect(user).not.toContainText("Secret dump body");
    await expect(window.getByTestId("message-assistant")).toHaveAttribute("data-status", "complete", {
      timeout: 30_000,
    });
  } finally {
    await app.close();
  }
});
