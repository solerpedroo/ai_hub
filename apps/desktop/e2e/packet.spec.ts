import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect, test, type ElectronApplication } from "@playwright/test";

const require = createRequire(import.meta.url);
const electronBinary = require("electron") as string;
const appRoot = path.join(fileURLToPath(new URL("..", import.meta.url)));

async function launchHub(packetFile: string): Promise<ElectronApplication> {
  return electron.launch({
    executablePath: electronBinary,
    args: [path.join(appRoot, "out/main/index.js")],
    cwd: appRoot,
    env: {
      ...process.env,
      AI_HUB_E2E: "1",
      AI_HUB_E2E_PACKET_FILE: packetFile,
      NODE_ENV: "production",
    },
  });
}

test("exports a packet from project A and continues in project B on another model", async () => {
  const packetFile = path.join(mkdtempSync(path.join(tmpdir(), "ai-hub-packet-")), "task.aihub-packet.json");
  const app = await launchHub(packetFile);
  try {
    const window = await app.firstWindow();
    await window.getByTestId("chat-composer").waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("chat-composer").fill("Continue the portable task");
    await window.getByTestId("chat-send").click();
    await expect(window.getByTestId("message-assistant")).toHaveAttribute("data-status", "complete", {
      timeout: 30_000,
    });
    await expect(window.getByTestId("packet-badge")).toBeVisible();
    await window.getByTestId("packet-open").click();
    await expect(window.getByTestId("packet-included")).toBeVisible();
    await expect(window.getByTestId("packet-destination")).toContainText("gpt-4o-mini");
    await window.getByTestId("packet-compile").click();
    await expect(window.getByTestId("packet-export")).toBeEnabled();
    await window.getByTestId("packet-export").click();
    await window.keyboard.press("Escape");

    await window.getByTestId("workspace-new-project-name").fill("Beta");
    await window.getByTestId("workspace-new-project").click();
    await expect(window.getByTestId("project-item").filter({ hasText: "Beta" })).toBeVisible();
    await window.getByTestId("project-item").filter({ hasText: "Beta" }).click();
    await window.getByTestId("workspace-new-conversation-title").fill("Continue");
    await window.getByTestId("workspace-new-conversation").click();
    await expect(window.getByTestId("conversation-item").filter({ hasText: "Continue" })).toBeVisible();
    await expect(window.getByTestId("packet-badge")).toBeVisible();

    await window.getByTestId("packet-open").click();
    await window.getByTestId("packet-import").click();
    await expect(window.getByTestId("packet-apply")).toBeVisible();
    await window.getByTestId("packet-apply").click();
    await expect(window.getByTestId("packet-applied")).toBeVisible();
    const anthropicValue = await window
      .getByTestId("workspace-key")
      .locator("option")
      .filter({ hasText: "anthropic" })
      .getAttribute("value");
    expect(anthropicValue).toBeTruthy();
    await window.getByTestId("workspace-key").selectOption(anthropicValue ?? "");
    await window.getByTestId("workspace-model").selectOption("claude-sonnet-4-20250514");
    await expect(window.getByTestId("packet-destination")).toContainText("claude-sonnet-4-20250514");
    await window.keyboard.press("Escape");
    await window.getByTestId("chat-composer").fill("Next step");
    await window.getByTestId("chat-send").click();
    await expect(window.getByTestId("message-assistant")).toHaveAttribute("data-status", "complete", {
      timeout: 30_000,
    });
  } finally {
    await app.close();
  }
});
