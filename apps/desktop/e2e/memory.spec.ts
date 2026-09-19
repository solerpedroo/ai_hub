import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect, test, type ElectronApplication } from "@playwright/test";

const require = createRequire(import.meta.url);
const electronBinary = require("electron") as string;
const appRoot = path.join(fileURLToPath(new URL("..", import.meta.url)));

async function launchHub(): Promise<ElectronApplication> {
  return electron.launch({
    executablePath: electronBinary,
    args: [path.join(appRoot, "out/main/index.js")],
    cwd: appRoot,
    env: {
      ...process.env,
      AI_HUB_E2E: "1",
      NODE_ENV: "production",
    },
  });
}

test("saves a project memory, sees it on the next chat, and can delete it", async () => {
  const app = await launchHub();
  try {
    const window = await app.firstWindow();
    const composer = window.getByTestId("chat-composer");
    await composer.waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("memory-open").click();
    await window.getByTestId("memory-title").fill("DB");
    await window.getByTestId("memory-body").fill("usamos PostgreSQL");
    await window.getByTestId("memory-save").click();
    await expect(window.getByTestId("memory-item")).toContainText("usamos PostgreSQL");
    await window.getByTestId("workspace-new-conversation-title").fill("Segunda");
    await window.getByTestId("workspace-new-conversation").click();
    await composer.fill("qual banco usamos?");
    await composer.press("Enter");
    await expect(window.getByTestId("message-assistant")).toHaveAttribute("data-status", "complete", {
      timeout: 30_000,
    });
    await expect(window.getByTestId("citation-memory")).toContainText("DB");
    await window.getByTestId("memory-delete").click();
    await expect(window.getByTestId("memory-item")).toHaveCount(0);
  } finally {
    await app.close();
  }
});
