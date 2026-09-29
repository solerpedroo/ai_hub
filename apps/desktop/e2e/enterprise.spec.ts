import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect, test } from "@playwright/test";

const require = createRequire(import.meta.url);
const electronBinary = require("electron") as string;
const appRoot = path.join(fileURLToPath(new URL("..", import.meta.url)));

test("creates a local enterprise organization through the validated IPC boundary", async () => {
  const app = await electron.launch({
    executablePath: electronBinary,
    args: [path.join(appRoot, "out/main/index.js")],
    cwd: appRoot,
    env: { ...process.env, AI_HUB_E2E: "1", NODE_ENV: "production" },
  });
  try {
    const window = await app.firstWindow();
    await window.getByTestId("nav-settings").click();
    await window.getByTestId("enterprise-name").fill("E2E Enterprise");
    await window.getByTestId("enterprise-create").click();
    await expect(window.getByTestId("enterprise-policy")).toBeVisible();
  } finally {
    await app.close();
  }
});
