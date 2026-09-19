import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { basename, relative, resolve, sep } from "node:path";
import { dialog, BrowserWindow, type OpenDialogOptions, type WebContents } from "electron";
import {
  MAX_FILE_BYTES,
  MAX_FILES_PER_SEND,
  MAX_FOLDER_DEPTH,
  MAX_FOLDER_FILES,
  assertFileAttachmentAccess,
  classifyFileName,
  extractFile,
  isPathInsideRoot,
  summarizeFolder,
  type FolderFileInput,
} from "@ai-hub/files";
import type { CompilerFile, ChatImagePart } from "@ai-hub/ai-gateway";
import { redactSecrets } from "@ai-hub/security";
import type { ProjectFileRecord } from "@ai-hub/db";
import {
  projectFileDtoSchema,
  type FilesAttachInput,
  type FilesIngestPathsInput,
  type ProjectFileDto,
} from "@ai-hub/shared";
import { isE2eMode } from "./e2e-mode";
import { getHubDatabase } from "./persistence";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "out",
  ".turbo",
  "coverage",
  ".next",
  ".cache",
]);

function tokenEstimate(text: string, hasImage: boolean): number {
  return Math.ceil(text.length / 4) + (hasImage ? 1_000 : 0);
}

function rethrowFilesError(error: unknown): never {
  if (error instanceof Error && error.message.startsWith("files:")) {
    throw error;
  }
  throw new Error("files:unsupported");
}

function excerptOf(text: string): string {
  const clipped = redactSecrets(text).replace(/\s+/g, " ").trim();
  return clipped.length <= 400 ? clipped : `${clipped.slice(0, 399)}…`;
}

export function toProjectFileDto(row: ProjectFileRecord): ProjectFileDto {
  return projectFileDtoSchema.parse({
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    kind: row.kind,
    mime: row.mime,
    byteSize: row.byteSize,
    tokenEstimate: row.tokenEstimate,
    excerpt: excerptOf(row.extract || (row.kind === "image" ? row.name : "")),
    truncated: row.truncated,
    visionRequired: row.kind === "image",
    createdAt: row.createdAt,
  });
}

async function persistExtract(input: {
  projectId: string | null;
  name: string;
  bytes: Uint8Array;
}): Promise<ProjectFileRecord> {
  const extracted = await extractFile(input.bytes, input.name);
  const text = redactSecrets(extracted.text);
  const imageJson = extracted.image ? JSON.stringify(extracted.image) : null;
  return getHubDatabase().repos.createProjectFile({
    projectId: input.projectId,
    name: input.name,
    kind: extracted.kind,
    mime: extracted.mime,
    byteSize: input.bytes.byteLength,
    tokenEstimate: tokenEstimate(text, extracted.image !== null),
    extract: text,
    imageJson,
    truncated: extracted.truncated,
  });
}

async function persistFolder(projectId: string | null, root: string): Promise<ProjectFileRecord> {
  const entries: FolderFileInput[] = [];
  const rootReal = await realpath(root);
  const visit = async (dir: string, depth: number): Promise<void> => {
    if (depth > MAX_FOLDER_DEPTH || entries.length >= MAX_FOLDER_FILES) {
      return;
    }
    const names = await readdir(dir);
    for (const name of names) {
      if (entries.length >= MAX_FOLDER_FILES) {
        return;
      }
      if (SKIP_DIRS.has(name) || name === ".." || name.includes("\0")) {
        continue;
      }
      const full = resolve(dir, name);
      let fullReal: string;
      try {
        fullReal = await realpath(full);
      } catch {
        continue;
      }
      if (!isPathInsideRoot(rootReal, fullReal, sep)) {
        continue;
      }
      const info = await stat(fullReal);
      const relativePath = relative(rootReal, fullReal).split(sep).join("/");
      if (info.isDirectory()) {
        entries.push({ relativePath });
        await visit(fullReal, depth + 1);
        continue;
      }
      if (!info.isFile() || info.size > MAX_FILE_BYTES) {
        continue;
      }
      const kind = classifyFileName(name);
      if (kind === "unsupported" || kind === "image" || kind === "pdf" || kind === "docx") {
        entries.push({ relativePath });
        continue;
      }
      const content = await readFile(fullReal, "utf8");
      entries.push({ relativePath, content: content.slice(0, 20_000) });
    }
  };
  await visit(rootReal, 0);
  const summary = summarizeFolder({ rootName: basename(root), files: entries });
  const text = redactSecrets(summary.text);
  return getHubDatabase().repos.createProjectFile({
    projectId,
    name: basename(root),
    kind: "folder-summary",
    mime: "text/plain",
    byteSize: text.length,
    tokenEstimate: tokenEstimate(text, false),
    extract: text,
    truncated: false,
  });
}

async function ingestResolved(projectId: string | null, target: string): Promise<ProjectFileRecord> {
  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      return await persistFolder(projectId, target);
    }
    if (!info.isFile()) {
      throw new Error("files:unsupported");
    }
    if (info.size > MAX_FILE_BYTES) {
      throw new Error("files:too_large");
    }
    const bytes = await readFile(target);
    return await persistExtract({ projectId, name: basename(target), bytes });
  } catch (error) {
    rethrowFilesError(error);
  }
}

export async function ingestDroppedPaths(input: FilesIngestPathsInput): Promise<ProjectFileDto[]> {
  if (input.items.length > MAX_FILES_PER_SEND) {
    throw new Error("files:limit");
  }
  const created: ProjectFileDto[] = [];
  for (const item of input.items) {
    const target = resolve(item.path);
    created.push(toProjectFileDto(await ingestResolved(input.projectId, target)));
  }
  return created;
}

export async function attachFromDialog(
  input: FilesAttachInput,
  sender: WebContents,
): Promise<ProjectFileDto[]> {
  const fileFixture = process.env.AI_HUB_E2E_ATTACH_FILE;
  const folderFixture = process.env.AI_HUB_E2E_ATTACH_FOLDER;
  if (isE2eMode() && input.kind === "file" && fileFixture && fileFixture.trim().length > 0) {
    return [toProjectFileDto(await ingestResolved(input.projectId, resolve(fileFixture)))];
  }
  if (isE2eMode() && input.kind === "folder" && folderFixture && folderFixture.trim().length > 0) {
    return [toProjectFileDto(await ingestResolved(input.projectId, resolve(folderFixture)))];
  }
  const window = BrowserWindow.fromWebContents(sender);
  const options: OpenDialogOptions =
    input.kind === "folder"
      ? { properties: ["openDirectory"] }
      : {
          properties: ["openFile", "multiSelections"],
          filters: [
            { name: "Documents", extensions: ["pdf", "docx", "txt", "md", "csv"] },
            { name: "Code", extensions: ["ts", "tsx", "js", "json", "py", "rs", "go"] },
            { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] },
          ],
        };
  const choice = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options);
  if (choice.canceled || choice.filePaths.length === 0) {
    return [];
  }
  if (choice.filePaths.length > MAX_FILES_PER_SEND) {
    throw new Error("files:limit");
  }
  const created: ProjectFileDto[] = [];
  for (const selected of choice.filePaths) {
    created.push(toProjectFileDto(await ingestResolved(input.projectId, selected)));
  }
  return created;
}

export function listProjectFileDtos(projectId: string | null): ProjectFileDto[] {
  return getHubDatabase().repos.listProjectFiles(projectId).map(toProjectFileDto);
}

export function removeProjectFile(id: string, projectId: string | null): void {
  const row = getHubDatabase().repos.getProjectFile(id);
  if (!row || row.projectId !== projectId) {
    throw new Error("files:project_mismatch");
  }
  getHubDatabase().repos.removeProjectFile(id);
}

export function loadSendAttachments(
  fileIds: string[] | undefined,
  projectId: string | null,
  vision: boolean,
  mode: "preview" | "send",
): { files: CompilerFile[]; images: ChatImagePart[] } {
  if (!fileIds || fileIds.length === 0) {
    return { files: [], images: [] };
  }
  if (fileIds.length > MAX_FILES_PER_SEND) {
    throw new Error("files:limit");
  }
  const repos = getHubDatabase().repos;
  const files: CompilerFile[] = [];
  const images: ChatImagePart[] = [];
  const seen = new Set<string>();
  for (const id of fileIds) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    const row = repos.getProjectFile(id);
    assertFileAttachmentAccess({
      exists: row !== null,
      rowProjectId: row?.projectId ?? null,
      conversationProjectId: projectId,
      kind: row?.kind ?? "unsupported",
      vision,
      mode,
    });
    if (!row) {
      throw new Error("files:unsupported");
    }
    if (row.kind === "image") {
      if (row.imageJson && vision) {
        const parsed = JSON.parse(row.imageJson) as { mime?: unknown; data?: unknown };
        if (
          typeof parsed.mime === "string" &&
          typeof parsed.data === "string" &&
          (parsed.mime === "image/png" ||
            parsed.mime === "image/jpeg" ||
            parsed.mime === "image/webp" ||
            parsed.mime === "image/gif")
        ) {
          images.push({ mime: parsed.mime, data: parsed.data });
        }
      }
      files.push({
        id: row.id,
        name: row.name,
        text: redactSecrets(`[Image: ${row.name}]`),
      });
      continue;
    }
    files.push({
      id: row.id,
      name: row.name,
      text: redactSecrets(row.extract),
    });
  }
  return { files, images };
}

