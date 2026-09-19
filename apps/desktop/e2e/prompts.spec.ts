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

test("resolves prompt variables, runs two models, and saves the winner", async () => {
  const app = await launchHub();
  try {
    const window = await app.firstWindow();
    await window.getByTestId("chat-composer").waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("nav-prompts").click();
    await expect(window.getByTestId("prompts-view")).toBeVisible();
    await window.getByTestId("prompt-folder-development").click();
    await window.getByTestId("prompt-item").filter({ hasText: "Code review" }).click();
    await expect(window.getByTestId("prompt-body")).toContainText("{{project}}");
    await window.getByTestId("prompt-insert").click();
    await expect(window.getByTestId("chat-composer")).toContainText("E2E");

    await window.getByTestId("nav-prompts").click();
    await window.getByTestId("prompt-item").filter({ hasText: "Code review" }).click();
    const modelA = window.getByTestId("playground-model-0");
    const modelB = window.getByTestId("playground-model-1");
    await expect(modelA.locator("option")).not.toHaveCount(0);
    const options = await modelA.locator("option").evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLOptionElement).value),
    );
    expect(options.length).toBeGreaterThanOrEqual(2);
    await modelA.selectOption(options[0] ?? "");
    await modelB.selectOption(options[1] ?? options[0] ?? "");
    await window.getByTestId("playground-run").click();
    await expect(window.getByTestId("playground-assistant-0")).toHaveAttribute("data-status", "complete", {
      timeout: 30_000,
    });
    await expect(window.getByTestId("playground-assistant-1")).toHaveAttribute("data-status", "complete", {
      timeout: 30_000,
    });
    await window.getByTestId("playground-winner-title").fill("Winner");
    await window.getByTestId("playground-save-0").click();
    await window.getByTestId("prompt-folder-development").click();
    await expect(window.getByTestId("prompt-item").filter({ hasText: "Winner" })).toBeVisible();
  } finally {
    await app.close();
  }
});
