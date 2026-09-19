import { writeFile } from "node:fs/promises";
import { BrowserWindow, dialog, protocol, type WebContents } from "electron";
import type { ArtifactRecord, HubRepos } from "@ai-hub/db";
import { redactSecrets } from "@ai-hub/security";
import {
  ARTIFACT_PROTOCOL,
  detectArtifacts,
  siblingsOf,
  type ArtifactDto,
  type ArtifactExportInput,
  type ArtifactExportResult,
  artifactExportResultSchema,
} from "@ai-hub/shared";
import { isE2eMode } from "./e2e-mode";
import { getHubDatabase } from "./persistence";

export const ARTIFACT_HTML_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data:",
  "font-src data:",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "navigate-to 'none'",
].join("; ");

const ARTIFACT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function toArtifactDto(row: ArtifactRecord): ArtifactDto {
  return {
    id: row.id,
    conversationId: row.conversationId,
    familyId: row.familyId,
    sourceMessageId: row.sourceMessageId,
    kind: row.kind,
    title: row.title,
    body: row.body,
    language: row.language,
    version: row.version,
    pinned: row.pinned,
    createdAt: row.createdAt,
  };
}

export function captureMessageArtifacts(repos: HubRepos, messageId: string): ArtifactRecord[] {
  if (repos.listArtifactsByMessage(messageId).length > 0) {
    return repos.listArtifactsByMessage(messageId);
  }
  const message = repos.getMessage(messageId);
  if (!message || message.role !== "assistant" || message.status !== "complete") {
    return [];
  }
  const detected = detectArtifacts(message.content);
  if (detected.length === 0) {
    return [];
  }
  const previous = previousAssistantSibling(repos, message);
  const previousArts = previous ? repos.listArtifactsByMessage(previous.id) : [];
  const created: ArtifactRecord[] = [];
  const usedPrev = new Set<string>();
  for (const item of detected) {
    const match = previousArts.find((row) => row.kind === item.kind && !usedPrev.has(row.id));
    if (match) {
      usedPrev.add(match.id);
    }
    created.push(
      repos.createArtifact({
        conversationId: message.conversationId,
        ...(match ? { familyId: match.familyId } : {}),
        sourceMessageId: message.id,
        kind: item.kind,
        title: redactSecrets(item.title),
        body: redactSecrets(item.body),
        language: item.language,
      }),
    );
  }
  return created;
}

function previousAssistantSibling(
  repos: HubRepos,
  message: { id: string; conversationId: string; createdAt: string },
): { id: string } | null {
  const siblings = siblingsOf(repos.listMessages(message.conversationId), message.id)
    .filter(
      (item) =>
        item.id !== message.id &&
        item.role === "assistant" &&
        item.status === "complete" &&
        item.createdAt < message.createdAt,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return siblings[0] ?? null;
}

export function wrapArtifactHtml(body: string): string {
  const csp = `<meta http-equiv="Content-Security-Policy" content="${ARTIFACT_HTML_CSP}">`;
  const trimmed = body.trim();
  if (/<html[\s>]/i.test(trimmed)) {
    if (/<head[\s>]/i.test(trimmed)) {
      return trimmed.replace(/<head([^>]*)>/i, `<head$1>${csp}`);
    }
    return trimmed.replace(/<html([^>]*)>/i, `<html$1><head>${csp}</head>`);
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${csp}</head><body>${trimmed}</body></html>`;
}

export function registerArtifactProtocol(): void {
  protocol.handle(ARTIFACT_PROTOCOL, (request) => {
    let id = "";
    try {
      id = new URL(request.url).hostname.toLowerCase();
    } catch {
      return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
    }
    if (!ARTIFACT_ID.test(id)) {
      return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
    }
    const artifact = getHubDatabase().repos.getArtifact(id);
    if (!artifact || artifact.kind !== "html") {
      return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
    }
    return new Response(wrapArtifactHtml(artifact.body), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "Content-Security-Policy": ARTIFACT_HTML_CSP,
      },
    });
  });
}

export async function exportArtifact(
  input: ArtifactExportInput,
  sender: WebContents,
): Promise<ArtifactExportResult> {
  const artifact = getHubDatabase().repos.getArtifact(input.id);
  if (!artifact) {
    throw new Error("Artifact not found");
  }
  const payload = exportPayload(artifact, input);
  const fixture = process.env.AI_HUB_E2E_ARTIFACT_FILE;
  if (isE2eMode() && fixture && fixture.trim().length > 0) {
    await writeFile(fixture, payload, "utf8");
    return artifactExportResultSchema.parse({ status: "saved" });
  }
  const window = BrowserWindow.fromWebContents(sender);
  const extension = input.format;
  const options = {
    defaultPath: `${filePart(redactSecrets(artifact.title))}.${extension}`,
    filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
  };
  const choice = window
    ? await dialog.showSaveDialog(window, options)
    : await dialog.showSaveDialog(options);
  if (choice.canceled || !choice.filePath) {
    return artifactExportResultSchema.parse({ status: "cancelled" });
  }
  await writeFile(choice.filePath, payload, "utf8");
  return artifactExportResultSchema.parse({ status: "saved" });
}

function exportPayload(
  artifact: ArtifactRecord,
  input: ArtifactExportInput,
): string {
  const body = redactSecrets(artifact.body);
  if (input.format === "svg") {
    const svg = input.svg?.trim() ?? "";
    if (!svg.startsWith("<svg") || artifact.kind !== "mermaid") {
      throw new Error("Invalid SVG export");
    }
    return redactSecrets(svg);
  }
  if (input.format === "html") {
    if (artifact.kind === "html") {
      return wrapArtifactHtml(body);
    }
    return wrapArtifactHtml(`<pre>${escapeHtml(body)}</pre>`);
  }
  if (artifact.kind === "code" && artifact.language) {
    return `\`\`\`${artifact.language}\n${body}\n\`\`\`\n`;
  }
  return body.endsWith("\n") ? body : `${body}\n`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function filePart(title: string): string {
  const cleaned = title.replace(/[<>:"/\\|?*]+/g, " ").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 80) : "artifact";
}
