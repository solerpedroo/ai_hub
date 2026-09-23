import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect, test } from "@playwright/test";

const require = createRequire(import.meta.url);
const electronBinary = require("electron") as string;
const appRoot = path.join(fileURLToPath(new URL("..", import.meta.url)));

test("selects an installed local model and records a zero-cost response", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ai-hub-offline-"));
  const pdf = path.join(dir, "local-source.pdf");
  const stream = "BT /F1 12 Tf 72 720 Td (Offline citation-marker payments use PostgreSQL) Tj ET";
  writeFileSync(pdf, Buffer.from(`%PDF-1.1\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n4 0 obj << /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n`, "latin1"));
  const app = await electron.launch({ executablePath: electronBinary, args: [path.join(appRoot, "out/main/index.js")], cwd: appRoot, env: { ...process.env, AI_HUB_E2E: "1", AI_HUB_E2E_OLLAMA_MODEL: "llama-fixture:latest", AI_HUB_E2E_ATTACH_FILE: pdf, NODE_ENV: "production" } });
  try {
    const window = await app.firstWindow();
    await window.getByTestId("chat-composer").waitFor({ state: "visible", timeout: 30_000 });
    const key = window.getByTestId("workspace-key");
    const localId = await key.locator("option").filter({ hasText: "ollama" }).getAttribute("value");
    expect(localId).not.toBeNull();
    await key.selectOption(localId!);
    await expect(window.getByTestId("workspace-model")).toHaveValue("llama-fixture:latest");
    await expect(window.getByTestId("offline-status")).toContainText("local");
    await window.getByTestId("packet-open").click();
    await window.getByTestId("packet-privacy").selectOption("maximum");
    await window.getByTestId("packet-dialog").press("Escape");
    await window.getByTestId("files-attach").click();
    await expect(window.getByTestId("files-chip").first()).toBeVisible({ timeout: 30_000 });
    await window.getByTestId("chat-composer").fill("Offline citation-marker payments use PostgreSQL");
    await expect(window.getByTestId("citation-rag").filter({ hasText: "local-source.pdf" })).toBeVisible({ timeout: 15_000 });
    await window.getByTestId("chat-composer").press("Enter");
    await expect(window.getByTestId("message-assistant")).toHaveAttribute("data-status", "complete", { timeout: 30_000 });
    await expect(window.getByTestId("message-assistant")).toContainText("Hello from mock");
    await expect(window.getByTestId("receipt-open")).toContainText("0.000000");
  } finally { await app.close(); }
});

test("offers an explicit local fallback after a cloud timeout", async () => {
  const app = await electron.launch({ executablePath: electronBinary, args: [path.join(appRoot, "out/main/index.js")], cwd: appRoot, env: { ...process.env, AI_HUB_E2E: "1", AI_HUB_E2E_OLLAMA_MODEL: "llama-fixture:latest", AI_HUB_E2E_CLOUD_FAILURE: "timeout", NODE_ENV: "production" } });
  try {
    const window = await app.firstWindow();
    const composer = window.getByTestId("chat-composer");
    await composer.waitFor({ state: "visible", timeout: 30_000 });
    await expect(window.getByTestId("workspace-key")).not.toHaveValue("26000000-0000-4000-8000-000000000001");
    await composer.fill("Use a local model if cloud is unavailable");
    await composer.press("Enter");
    const fallback = window.getByTestId("fallback-dialog");
    await expect(fallback).toContainText("ollama", { timeout: 30_000 });
    await expect(window.getByTestId("message-assistant")).toHaveAttribute("data-status", "interrupted");
    await window.getByTestId("fallback-confirm").click();
    await expect(window.getByTestId("workspace-model")).toHaveValue("llama-fixture:latest");
    await expect(window.getByTestId("message-assistant").last()).toHaveAttribute("data-status", "complete", { timeout: 30_000 });
    await expect(window.getByTestId("receipt-open").last()).toContainText("0.000000");
  } finally { await app.close(); }
});
