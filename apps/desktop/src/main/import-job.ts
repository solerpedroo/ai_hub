import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { BrowserWindow, dialog, type OpenDialogOptions, type WebContents } from "electron";
import {
  IpcChannel,
  importEventSchema,
  importPickResultSchema,
  importReportSchema,
  type ImportEvent,
  type ImportPickResult,
  type ImportReport,
  type ImportStartInput,
  type ImportStartResult,
} from "@ai-hub/shared";
import { ImportParseError, parseImportBytes } from "@ai-hub/shared/import";
import { isE2eMode } from "./e2e-mode";
import { getHubDatabase } from "./persistence";

const tickets = new Map<string, { path: string; fileName: string }>();
const controllers = new Map<string, AbortController>();

function emit(sender: WebContents, event: ImportEvent): void {
  if (sender.isDestroyed()) {
    return;
  }
  sender.send(IpcChannel.importEvent, importEventSchema.parse(event));
}

function emptyReport(total: number): ImportReport {
  return importReportSchema.parse({
    ok: 0,
    skipped: 0,
    errors: [],
    attachmentsSkipped: 0,
    total,
  });
}

export async function pickImportFile(sender: WebContents): Promise<ImportPickResult> {
  const fixture = process.env.AI_HUB_E2E_IMPORT_FIXTURE;
  if (isE2eMode() && fixture && fixture.trim().length > 0) {
    tickets.clear();
    const ticket = randomUUID();
    const fileName = basename(fixture);
    tickets.set(ticket, { path: fixture, fileName });
    return importPickResultSchema.parse({ status: "picked", ticket, fileName });
  }
  const window = BrowserWindow.fromWebContents(sender);
  const options: OpenDialogOptions = {
    properties: ["openFile"],
    filters: [
      { name: "Exports", extensions: ["json", "zip"] },
      { name: "JSON", extensions: ["json"] },
      { name: "ZIP", extensions: ["zip"] },
    ],
  };
  const choice = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
  const selected = choice.filePaths[0];
  if (choice.canceled || !selected) {
    return importPickResultSchema.parse({ status: "cancelled" });
  }
  tickets.clear();
  const ticket = randomUUID();
  const fileName = basename(selected);
  tickets.set(ticket, { path: selected, fileName });
  return importPickResultSchema.parse({ status: "picked", ticket, fileName });
}

export function startImportJob(input: ImportStartInput, sender: WebContents): ImportStartResult {
  const ticket = tickets.get(input.ticket);
  if (!ticket) {
    throw new Error("Import file is no longer available. Pick the file again.");
  }
  const repos = getHubDatabase().repos;
  if (input.projectId && !repos.getProject(input.projectId)) {
    throw new Error("Project not found");
  }
  tickets.delete(input.ticket);
  const job = repos.createImportJob(input.source);
  const controller = new AbortController();
  controllers.set(job.id, controller);
  repos.updateImportJob(job.id, "running", null);
  void runImport({
    jobId: job.id,
    path: ticket.path,
    source: input.source,
    projectId: input.projectId,
    sender,
    signal: controller.signal,
  });
  return { jobId: job.id };
}

export function cancelImportJob(jobId: string): void {
  controllers.get(jobId)?.abort();
}

async function runImport(input: {
  jobId: string;
  path: string;
  source: ImportStartInput["source"];
  projectId: string | null;
  sender: WebContents;
  signal: AbortSignal;
}): Promise<void> {
  const repos = getHubDatabase().repos;
  try {
    const bytes = new Uint8Array(await readFile(input.path));
    if (input.signal.aborted) {
      persist(input.jobId, "cancelled", emptyReport(0));
      emit(input.sender, { type: "done", jobId: input.jobId, status: "cancelled", report: emptyReport(0) });
      return;
    }
    const conversations = parseImportBytes(input.source, bytes);
    const report = emptyReport(conversations.length);
    for (const [index, conversation] of conversations.entries()) {
      if (input.signal.aborted) {
        persist(input.jobId, "cancelled", report);
        emit(input.sender, { type: "done", jobId: input.jobId, status: "cancelled", report });
        return;
      }
      const attachments = conversation.messages.filter((message) => message.skippedAttachment).length;
      try {
        const result = repos.importConversation({
          projectId: input.projectId,
          source: conversation.source,
          externalId: conversation.externalId,
          title: conversation.title,
          createdAtMs: conversation.createdAtMs,
          updatedAtMs: conversation.updatedAtMs,
          messages: conversation.messages.map((message) => ({
            role: message.role,
            content: message.content,
            createdAtMs: message.createdAtMs,
          })),
        });
        if (result.outcome === "created") {
          report.ok += 1;
          report.attachmentsSkipped += attachments;
        } else if (result.outcome === "skipped") {
          report.skipped += 1;
        } else {
          report.errors.push({ reason: "empty" });
        }
      } catch {
        report.errors.push({ reason: "failed" });
      }
      emit(input.sender, {
        type: "progress",
        jobId: input.jobId,
        processed: index + 1,
        total: report.total,
        ok: report.ok,
        skipped: report.skipped,
      });
    }
    persist(input.jobId, "complete", report);
    emit(input.sender, { type: "done", jobId: input.jobId, status: "complete", report });
  } catch (error) {
    const code =
      error instanceof ImportParseError
        ? error.code
        : "generic";
    const failed = emptyReport(0);
    persist(input.jobId, "failed", failed);
    emit(input.sender, { type: "error", jobId: input.jobId, code });
  } finally {
    controllers.delete(input.jobId);
  }
}

function persist(jobId: string, status: "complete" | "cancelled" | "failed", report: ImportReport): void {
  getHubDatabase().repos.updateImportJob(jobId, status, JSON.stringify(importReportSchema.parse(report)));
}
