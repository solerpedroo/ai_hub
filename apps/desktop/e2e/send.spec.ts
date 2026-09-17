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

test("sends a mocked message and shows the assistant bubble", async () => {
  const app = await launchHub();
  try {
    const window = await app.firstWindow();
    await window.getByTestId("chat-composer").waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("chat-composer").fill("Hello");
    await window.getByTestId("chat-send").click();
    await expect(window.getByTestId("message-assistant")).toContainText("Hello from mock", {
      timeout: 30_000,
    });
    await expect(window.getByTestId("message-assistant")).toHaveAttribute("data-status", "complete");
  } finally {
    await app.close();
  }
});

test("stop aborts the mock stream without treating it as a request failure", async () => {
  const app = await launchHub();
  try {
    const window = await app.firstWindow();
    await window.getByTestId("chat-composer").waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("chat-composer").fill("Hello");
    await window.getByTestId("chat-send").click();
    const bubble = window.getByTestId("message-assistant");
    await expect(bubble).toHaveAttribute("data-status", "streaming", { timeout: 30_000 });
    await window.getByTestId("chat-stop").click();
    await expect(bubble).toHaveAttribute("data-status", "aborted", { timeout: 30_000 });
    await expect(window.getByTestId("workspace-error")).toHaveCount(0);
  } finally {
    await app.close();
  }
});

test("regenerate keeps the previous answer as a sibling", async () => {
  const app = await launchHub();
  try {
    const window = await app.firstWindow();
    await window.getByTestId("chat-composer").waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("chat-composer").fill("Hello");
    await window.getByTestId("chat-send").click();
    await expect(window.getByTestId("message-assistant")).toHaveAttribute("data-status", "complete", {
      timeout: 30_000,
    });
    await window.getByTestId("message-regenerate").click();
    await expect(window.getByTestId("sibling-count")).toHaveText("2 / 2", { timeout: 30_000 });
    await expect(window.getByTestId("message-assistant")).toHaveAttribute("data-status", "complete", {
      timeout: 30_000,
    });
    await window.getByTestId("tree-toggle").click();
    await expect(window.getByTestId("conversation-tree")).toBeVisible();
    await expect(window.getByTestId("tree-node")).toHaveCount(3);
  } finally {
    await app.close();
  }
});
