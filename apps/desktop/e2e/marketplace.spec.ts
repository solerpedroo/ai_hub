import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect, test } from "@playwright/test";

const require = createRequire(import.meta.url);
const electronBinary = require("electron") as string;
const appRoot = path.join(fileURLToPath(new URL("..", import.meta.url)));

test("installs and removes the internal project files MCP pack", async () => {
  const app = await electron.launch({
    executablePath: electronBinary,
    args: [path.join(appRoot, "out/main/index.js")],
    cwd: appRoot,
    env: { ...process.env, AI_HUB_E2E: "1", NODE_ENV: "production" },
  });
  try {
    const window = await app.firstWindow();
    await window.getByTestId("nav-settings").click();
    const pack = window.getByTestId("marketplace-pack-ai-hub.project-files");
    await expect(pack).toHaveText(/Install|Instalar/);
    await pack.click();
    await expect(pack).toHaveText(/Remove|Remover/);
    await pack.click();
    await expect(pack).toHaveText(/Install|Instalar/);
  } finally {
    await app.close();
  }
});
