import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect, test, type ElectronApplication } from "@playwright/test";

const require = createRequire(import.meta.url);
const electronBinary = require("electron") as string;
const appRoot = path.join(fileURLToPath(new URL("..", import.meta.url)));
const fixturePath = path.join(appRoot, "e2e/fixtures/chatgpt-conversations.json");

async function launchHub(): Promise<ElectronApplication> {
  return electron.launch({
    executablePath: electronBinary,
    args: [path.join(appRoot, "out/main/index.js")],
    cwd: appRoot,
    env: {
      ...process.env,
      AI_HUB_E2E: "1",
      AI_HUB_E2E_IMPORT_FIXTURE: fixturePath,
      NODE_ENV: "production",
    },
  });
}

test("imports a ChatGPT export into Importadas and skips the same id on reimport", async () => {
  const app = await launchHub();
  try {
    const window = await app.firstWindow();
    await window.getByTestId("nav-import").waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("nav-import").click();
    await window.getByTestId("import-pick-file").click();
    await expect(window.getByTestId("import-file-name")).toContainText("chatgpt-conversations.json");
    await window.getByTestId("import-start").click();
    const report = window.getByTestId("import-report");
    await expect(report).toHaveAttribute("data-ok", "1", { timeout: 30_000 });
    await expect(report).toHaveAttribute("data-skipped", "0");

    await window.getByTestId("import-pick-file").click();
    await window.getByTestId("import-start").click();
    await expect(report).toHaveAttribute("data-ok", "0", { timeout: 30_000 });
    await expect(report).toHaveAttribute("data-skipped", "1");

    await window.getByTestId("import-open-destination").click();
    await expect(window.getByTestId("conversation-item")).toContainText("Alpha thread");
    await expect(window.getByTestId("message-user").first()).toContainText("Hello from ChatGPT");
    await expect(window.getByTestId("message-assistant")).toContainText("Hi there");
    await expect(window.getByTestId("message-user").last()).toContainText("[file not imported]");
    await window.getByTestId("receipt-open").click();
    await expect(window.getByTestId("receipt-source")).toHaveAttribute("data-source", "import");
  } finally {
    await app.close();
  }
});
