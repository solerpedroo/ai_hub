import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect, test, type ElectronApplication } from "@playwright/test";

const require = createRequire(import.meta.url);
const electronBinary = require("electron") as string;
const appRoot = path.join(fileURLToPath(new URL("..", import.meta.url)));

async function launchEmptyHub(): Promise<ElectronApplication> {
  return electron.launch({
    executablePath: electronBinary,
    args: [path.join(appRoot, "out/main/index.js")],
    cwd: appRoot,
    env: {
      ...process.env,
      AI_HUB_E2E: "1",
      AI_HUB_E2E_EMPTY: "1",
      NODE_ENV: "production",
    },
  });
}

test("first-run wizard reaches a mocked first answer", async () => {
  const app = await launchEmptyHub();
  const started = Date.now();
  try {
    const window = await app.firstWindow();
    await window.getByTestId("onboarding").waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("onboarding-locale-en").click();
    await window.getByTestId("onboarding-locale-next").click();
    await window.getByTestId("onboarding-provider").selectOption("openrouter");
    await window.getByTestId("onboarding-secret").fill("sk-e2ewizardABCDEFGH");
    await window.getByTestId("onboarding-save-test").click();
    await expect(window.getByTestId("onboarding-test-ok")).toBeVisible({ timeout: 15_000 });
    await window.getByTestId("onboarding-finish").click();
    await window.getByTestId("chat-composer").waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("chat-composer").fill("Hello");
    await window.getByTestId("chat-send").click();
    await expect(window.getByTestId("message-assistant")).toContainText("Hello from mock", {
      timeout: 30_000,
    });
    expect(Date.now() - started).toBeLessThan(90_000);
  } finally {
    await app.close();
  }
});
