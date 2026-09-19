import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page,
} from "@playwright/test";

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

async function openPalette(window: Page, query?: string): Promise<void> {
  await window.keyboard.press("Control+K");
  await expect(window.getByTestId("command-palette")).toBeVisible();
  await expect(window.getByTestId("command-input")).toBeFocused();
  if (query) {
    await window.getByTestId("command-input").fill(query);
  }
}

test("command palette exposes actions, models, projects, search, and shortcuts by keyboard", async () => {
  const app = await launchHub();
  try {
    const window = await app.firstWindow();
    const composer = window.getByTestId("chat-composer");
    await composer.waitFor({ state: "visible", timeout: 30_000 });

    await composer.fill("palette-needle-42");
    await composer.press("Enter");
    await expect(window.getByTestId("message-assistant")).toHaveAttribute(
      "data-status",
      "complete",
      {
        timeout: 30_000,
      },
    );

    await openPalette(window, "export active");
    await expect(window.getByTestId("command-export-active")).toBeVisible();
    await expect(window.getByTestId("command-export-active")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
    await window.keyboard.press("Escape");

    await openPalette(window, "E2E");
    await expect(window.getByTestId("command-project")).toHaveText("E2E");
    await window.keyboard.press("Enter");
    await expect(
      window.getByTestId("project-item").filter({ hasText: "E2E" }),
    ).toHaveAttribute("aria-current", "page");

    await openPalette(window, "palette-needle-42");
    await expect(window.getByTestId("command-search-hit")).toContainText(
      "palette-needle-42",
      {
        timeout: 10_000,
      },
    );
    await window.keyboard.press("Enter");
    await expect(window.getByTestId("message-user")).toContainText("palette-needle-42");

    await openPalette(window, "Claude 3.5 Haiku");
    await expect(window.getByTestId("command-model")).toHaveCount(1);
    await window.keyboard.press("Enter");
    await expect(window.getByTestId("workspace-model")).toHaveValue(
      "claude-3-5-haiku-20241022",
    );

    await window.keyboard.press("Control+/");
    await expect(window.getByTestId("shortcuts-dialog")).toBeVisible();
    await expect(window.getByTestId("shortcuts-dialog")).toContainText("/packet");
    await window.keyboard.press("Escape");
    await expect(window.getByTestId("shortcuts-dialog")).toHaveCount(0);

    await openPalette(window, "providers");
    await window.keyboard.press("Enter");
    await expect(window.getByTestId("secrets-provider")).toBeFocused();

    await openPalette(window, "import hub");
    await expect(window.getByTestId("command-import")).toBeVisible();
    await window.keyboard.press("Enter");
    await expect(window.getByRole("heading", { name: "Import Hub" })).toBeVisible();

    await openPalette(window, "settings");
    await window.keyboard.press("Enter");
    await expect(
      window.getByRole("heading", { name: /Aparência e chaves|Appearance and keys/ }),
    ).toBeFocused();

    await window.keyboard.press("Control+K");
    await expect(window.getByTestId("command-palette")).toBeVisible();
    await window.getByTestId("command-input").fill("inbox");
    await expect(window.getByTestId("command-inbox")).toBeVisible();
    await window.keyboard.press("Enter");
    await expect(window.getByTestId("inbox-avulsas")).toHaveAttribute("aria-current", "page");

    await openPalette(window, "imported");
    await expect(window.getByTestId("command-imported")).toBeVisible();
    await window.keyboard.press("Enter");
    await expect(window.getByTestId("inbox-imported")).toHaveAttribute("aria-current", "page");
  } finally {
    await app.close();
  }
});

test("slash commands execute UI actions without being sent to the provider", async () => {
  const app = await launchHub();
  try {
    const window = await app.firstWindow();
    const composer = window.getByTestId("chat-composer");
    await composer.waitFor({ state: "visible", timeout: 30_000 });
    await expect(window.getByTestId("conversation-item")).toHaveCount(1);

    await composer.fill("/");
    await expect(window.getByTestId("slash-command-list")).toBeVisible();
    await composer.press("ArrowDown");
    await composer.press("Enter");
    await expect(window.getByTestId("conversation-item")).toHaveCount(2);
    await expect(window.getByTestId("message-user")).toHaveCount(0);

    await composer.fill("/model");
    await composer.press("Enter");
    await expect(window.getByTestId("workspace-model")).toBeFocused();
    await expect(composer).toHaveValue("");

    await composer.fill("/compact");
    await composer.press("Enter");
    await expect(window.getByTestId("compact-enabled")).toBeVisible();
    await expect(window.getByTestId("message-user")).toHaveCount(0);

    await composer.fill("/packet");
    await composer.press("Enter");
    await expect(window.getByTestId("packet-dialog")).toBeVisible();
    await window.keyboard.press("Escape");

    await composer.fill("/cap");
    await composer.press("Enter");
    await expect(window.getByTestId("spend-cap-request")).toBeFocused();

    await openPalette(window, "new chat");
    await window.keyboard.press("Enter");
    const nextComposer = window.getByTestId("chat-composer");
    await nextComposer.waitFor({ state: "visible" });

    await nextComposer.fill("/compact");
    await nextComposer.press("Escape");
    await expect(window.getByTestId("slash-command-list")).toHaveCount(0);
    await nextComposer.press("Enter");
    await expect(window.getByTestId("compact-enabled")).toBeVisible();
    await expect(window.getByTestId("message-user")).toHaveCount(0);

    await nextComposer.fill("/packet");
    await window.getByTestId("chat-send").click();
    await expect(window.getByTestId("packet-dialog")).toBeVisible();
    await expect(window.getByTestId("message-user")).toHaveCount(0);
    await window.keyboard.press("Escape");

    await nextComposer.fill("/unknown");
    await nextComposer.press("Enter");
    await expect(window.getByTestId("message-user")).toContainText("/unknown");
    await expect(window.getByTestId("message-assistant")).toHaveAttribute(
      "data-status",
      "complete",
      {
        timeout: 30_000,
      },
    );

    const beforeCtrlN = await window.getByTestId("conversation-item").count();
    await nextComposer.press("Control+N");
    await expect(window.getByTestId("conversation-item")).toHaveCount(beforeCtrlN + 1);
  } finally {
    await app.close();
  }
});
