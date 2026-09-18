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

test("settings lists OpenRouter as a first-class provider", async () => {
  const app = await launchHub();
  try {
    const window = await app.firstWindow();
    await window.getByTestId("nav-settings").click();
    await expect(window.getByTestId("secrets-provider")).toBeVisible();
    await expect(window.getByTestId("secrets-provider")).toContainText("OpenRouter");
    await expect(window.getByTestId("secrets-test").first()).toBeVisible();
  } finally {
    await app.close();
  }
});

test("creates three projects and search finds an old message", async () => {
  const app = await launchHub();
  try {
    const window = await app.firstWindow();
    await window.getByTestId("chat-composer").waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("chat-composer").fill("Hello");
    await window.getByTestId("chat-send").click();
    await expect(window.getByTestId("message-assistant")).toContainText("Hello from mock", {
      timeout: 30_000,
    });
    await window.getByTestId("workspace-new-project-name").fill("Alpha");
    await window.getByTestId("workspace-new-project").click();
    await window.getByTestId("workspace-new-project-name").fill("Beta");
    await window.getByTestId("workspace-new-project").click();
    await expect(window.getByTestId("project-item")).toHaveCount(3);
    await window.getByTestId("workspace-search").fill("Hello from mock");
    await expect(window.getByTestId("search-hit")).toContainText("Hello from mock", { timeout: 10_000 });
  } finally {
    await app.close();
  }
});

test("deletes a project and moves its chats to Inbox", async () => {
  const app = await launchHub();
  try {
    const window = await app.firstWindow();
    await window.getByTestId("chat-composer").waitFor({ state: "visible", timeout: 30_000 });
    await expect(window.getByTestId("project-item")).toHaveCount(1);
    await window.getByTestId("workspace-new-project-name").fill("Temp");
    await window.getByTestId("workspace-new-project").click();
    await expect(window.getByTestId("project-item")).toHaveCount(2);
    window.once("dialog", (dialog) => {
      void dialog.accept();
    });
    await window.getByTestId("project-delete").click();
    await expect(window.getByTestId("project-item")).toHaveCount(1);
    await expect(window.getByTestId("inbox-avulsas")).toBeVisible();
  } finally {
    await app.close();
  }
});

test("switches from GPT to Claude on the same thread", async () => {
  const app = await launchHub();
  try {
    const window = await app.firstWindow();
    await window.getByTestId("chat-composer").waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("chat-composer").fill("Hello");
    await window.getByTestId("chat-send").click();
    await expect(window.getByTestId("message-assistant")).toHaveAttribute("data-status", "complete", {
      timeout: 30_000,
    });
    const anthropicValue = await window
      .getByTestId("workspace-key")
      .locator("option")
      .filter({ hasText: "anthropic" })
      .getAttribute("value");
    expect(anthropicValue).toBeTruthy();
    await window.getByTestId("workspace-key").selectOption(anthropicValue ?? "");
    await window.getByTestId("workspace-model").selectOption("claude-sonnet-4-20250514");
    await expect(window.getByTestId("model-switch-notice")).toBeVisible();
    await window.getByTestId("chat-composer").fill("Follow up");
    await window.getByTestId("chat-send").click();
    await expect(window.getByTestId("message-assistant")).toHaveCount(2, { timeout: 30_000 });
    await expect(window.getByTestId("packet-badge")).toBeVisible();
  } finally {
    await app.close();
  }
});

test("a zero request cap blocks send before an assistant bubble appears", async () => {
  const app = await launchHub();
  try {
    const window = await app.firstWindow();
    await window.getByTestId("nav-settings").click();
    await window.getByTestId("spend-cap-request").fill("0");
    await window.getByTestId("spend-cap-save").click();
    await window.getByTestId("nav-home").click();
    await window.getByTestId("chat-composer").waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("chat-composer").fill("Hello");
    await window.getByTestId("chat-send").click();
    await expect(window.getByTestId("workspace-error")).toBeVisible({ timeout: 15_000 });
    await expect(window.getByTestId("message-assistant")).toHaveCount(0);
    await expect(window.getByTestId("chat-composer")).toHaveValue("Hello");
    await window.getByTestId("cap-allow-once").click();
    await expect(window.getByTestId("message-assistant")).toContainText("Hello from mock", {
      timeout: 30_000,
    });
  } finally {
    await app.close();
  }
});

test("assistant receipt opens a detail dialog without treating abort as failure", async () => {
  const app = await launchHub();
  try {
    const window = await app.firstWindow();
    await window.getByTestId("chat-composer").waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("chat-composer").fill("Hello");
    await window.getByTestId("chat-send").click();
    await expect(window.getByTestId("message-assistant")).toHaveAttribute("data-status", "complete", {
      timeout: 30_000,
    });
    await window.getByTestId("receipt-open").click();
    await expect(window.getByTestId("receipt-dialog")).toBeVisible();
    await window.keyboard.press("Escape");
    await expect(window.getByTestId("receipt-dialog")).toHaveCount(0);
    await window.getByTestId("nav-debug").click();
    await expect(window.getByTestId("debug-snapshot")).toBeVisible();
  } finally {
    await app.close();
  }
});
