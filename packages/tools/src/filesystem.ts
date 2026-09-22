import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";

export const MAX_TOOL_FILE_BYTES = 64 * 1024;

export function assertSafeRelativePath(value: string): string {
  if (value.length === 0 || value.length > 1024 || value.includes("\0") || isAbsolute(value) || /^[a-z]:[\\/]/i.test(value)) {
    throw new Error("tools:invalid_path");
  }
  const normalized = value.replace(/\\/g, "/");
  if (normalized.split("/").some((part) => part.length === 0 || part === "." || part === "..")) {
    throw new Error("tools:invalid_path");
  }
  return normalized;
}

function isWithinRoot(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

export async function readScopedFile(rootPath: string, relativePath: string): Promise<{ content: string; fileName: string; truncated: boolean }> {
  try {
    const safePath = assertSafeRelativePath(relativePath);
    const root = await realpath(rootPath);
    const candidate = await realpath(resolve(root, safePath));
    if (!isWithinRoot(root, candidate)) throw new Error("tools:path_outside_root");
    const handle = await open(candidate, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const resolvedAfterOpen = await realpath(candidate);
      if (!isWithinRoot(root, resolvedAfterOpen)) throw new Error("tools:path_outside_root");
      const info = await handle.stat();
      if (!info.isFile()) throw new Error("tools:not_a_file");
      const buffer = Buffer.allocUnsafe(Math.min(info.size, MAX_TOOL_FILE_BYTES + 1));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      return {
        content: buffer.subarray(0, Math.min(bytesRead, MAX_TOOL_FILE_BYTES)).toString("utf8"),
        fileName: basename(resolvedAfterOpen),
        truncated: info.size > MAX_TOOL_FILE_BYTES || bytesRead > MAX_TOOL_FILE_BYTES,
      };
    } finally { await handle.close(); }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("tools:")) throw error;
    throw new Error("tools:read_failed");
  }
}
