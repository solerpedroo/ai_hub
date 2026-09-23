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
    env: { ...process.env, AI_HUB_E2E: "1", NODE_ENV: "production" },
  });
}

test("shows the scoped Developer Mode controls", async () => {
  const app = await launchHub();
  try {
    const window = await app.firstWindow();
    await window.getByTestId("chat-composer").waitFor({ state: "visible", timeout: 30_000 });
    await expect(window.getByTestId("permission-center")).toBeVisible();
    await expect(window.getByTestId("developer-mode")).toBeVisible();
    await expect(window.getByTestId("developer-diff")).toBeVisible();
    await expect(window.getByTestId("developer-review")).toBeVisible();
  } finally {
    await app.close();
  }
});
