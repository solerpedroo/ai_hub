import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect, test } from "@playwright/test";

const require = createRequire(import.meta.url);
const electronBinary = require("electron") as string;
const appRoot = path.join(fileURLToPath(new URL("..", import.meta.url)));

test("sends a mocked message and shows the assistant bubble", async () => {
  const app = await electron.launch({
    executablePath: electronBinary,
    args: [path.join(appRoot, "out/main/index.js")],
    cwd: appRoot,
    env: {
      ...process.env,
      AI_HUB_E2E: "1",
      NODE_ENV: "production",
    },
  });

  try {
    const window = await app.firstWindow();
    await window.getByTestId("chat-composer").waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("chat-composer").fill("Hello");
    await window.getByTestId("chat-send").click();
    await expect(window.getByTestId("message-assistant")).toContainText("Hello from mock", {
      timeout: 30_000,
    });
  } finally {
    await app.close();
  }
});
