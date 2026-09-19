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

test("desenhe a arquitetura opens a versioned mermaid canvas", async () => {
  const app = await launchHub();
  try {
    const window = await app.firstWindow();
    await window.getByTestId("chat-composer").waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("chat-composer").fill("desenhe a arquitetura deste fluxo");
    await window.getByTestId("chat-send").click();
    await expect(window.getByTestId("message-assistant")).toHaveAttribute("data-status", "complete", {
      timeout: 30_000,
    });
    await expect(window.getByTestId("artifact-canvas")).toBeVisible({ timeout: 15_000 });
    await expect(window.getByTestId("artifact-kind")).toContainText("Mermaid");
    await expect(window.getByTestId("artifact-editor")).toContainText("flowchart LR");
    await window.getByTestId("artifact-editor").fill("flowchart LR\n  A[Composer] --> Z[Canvas]\n");
    await window.getByTestId("artifact-save").click();
    await expect(window.getByTestId("artifact-version").locator("option")).toHaveCount(2);
    await window.getByTestId("workspace-open").click();
    await expect(window.getByTestId("artifact-workspace-item")).toBeVisible();
    await window.getByTestId("artifact-workspace-item").click();
    await expect(window.getByTestId("artifact-canvas")).toBeVisible();
  } finally {
    await app.close();
  }
});
