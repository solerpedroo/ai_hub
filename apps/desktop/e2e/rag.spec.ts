import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect, test, type ElectronApplication } from "@playwright/test";

const require = createRequire(import.meta.url);
const electronBinary = require("electron") as string;
const appRoot = path.join(fileURLToPath(new URL("..", import.meta.url)));

function minimalPdf(text: string): Buffer {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const body = `${stream.length}\nstream\n${stream}\nendstream`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${stream.length} >> ${body} endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];
  return Buffer.from(`%PDF-1.1\n${objects.join("\n")}\n`, "latin1");
}

async function launchHub(env: Record<string, string>): Promise<ElectronApplication> {
  return electron.launch({
    executablePath: electronBinary,
    args: [path.join(appRoot, "out/main/index.js")],
    cwd: appRoot,
    env: {
      ...process.env,
      AI_HUB_E2E: "1",
      NODE_ENV: "production",
      ...env,
    },
  });
}

test("indexes 10 PDFs and cites the matching chunk", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ai-hub-rag-"));
  mkdirSync(dir, { recursive: true });
  for (let i = 1; i <= 10; i += 1) {
    const body =
      i === 3
        ? "Section 3 citation-marker payments use PostgreSQL uniquely"
        : `Filler document number ${i} about rust tokio and unrelated stack`;
    writeFileSync(path.join(dir, `doc-${String(i).padStart(2, "0")}.pdf`), minimalPdf(body));
  }
  const app = await launchHub({ AI_HUB_E2E_ATTACH_DIR: dir });
  try {
    const window = await app.firstWindow();
    const composer = window.getByTestId("chat-composer");
    await composer.waitFor({ state: "visible", timeout: 30_000 });
    await window.getByTestId("packet-open").click();
    await window.getByTestId("packet-privacy").selectOption("maximum");
    await window.getByTestId("packet-dialog").press("Escape");
    await window.getByTestId("files-attach").click();
    await expect(window.getByTestId("files-chip").first()).toBeVisible({ timeout: 30_000 });
    await composer.fill("where is the citation-marker about payments?");
    await expect(window.getByTestId("citation-rag").filter({ hasText: "doc-03.pdf" })).toBeVisible({
      timeout: 15_000,
    });
    await composer.press("Enter");
    await expect(window.getByTestId("message-assistant")).toHaveAttribute("data-status", "complete", {
      timeout: 30_000,
    });
    await expect(window.getByTestId("citation-rag").filter({ hasText: "doc-03.pdf" })).toBeVisible({
      timeout: 15_000,
    });
  } finally {
    await app.close();
  }
});
