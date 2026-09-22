import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertSafeRelativePath, MAX_TOOL_FILE_BYTES, readScopedFile } from "./filesystem";

describe("scoped filesystem connector", () => {
  it("rejects absolute paths, traversal, and Windows drive paths", () => {
    expect(() => assertSafeRelativePath("../secret.txt")).toThrow("tools:invalid_path");
    expect(() => assertSafeRelativePath("C:\\secret.txt")).toThrow("tools:invalid_path");
    expect(() => assertSafeRelativePath("/secret.txt")).toThrow("tools:invalid_path");
  });

  it("reads only a real file inside the configured root", async () => {
    const root = await mkdtemp(join(tmpdir(), "ai-hub-tools-"));
    try {
      await writeFile(join(root, "safe.txt"), "hello");
      await expect(readScopedFile(root, "safe.txt")).resolves.toMatchObject({ content: "hello", fileName: "safe.txt" });
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("does not leak an absolute root when a file is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "ai-hub-tools-"));
    try {
      await expect(readScopedFile(root, "missing.txt")).rejects.toThrow("tools:read_failed");
      await expect(readScopedFile(root, "missing.txt")).rejects.not.toThrow(root);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("reads only the bounded prefix of a larger file", async () => {
    const root = await mkdtemp(join(tmpdir(), "ai-hub-tools-"));
    try {
      await writeFile(join(root, "large.txt"), "x".repeat(MAX_TOOL_FILE_BYTES + 10));
      const output = await readScopedFile(root, "large.txt");
      expect(output.content).toHaveLength(MAX_TOOL_FILE_BYTES);
      expect(output.truncated).toBe(true);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("rejects a symlink that escapes the project root", async () => {
    const root = await mkdtemp(join(tmpdir(), "ai-hub-tools-root-"));
    const outside = await mkdtemp(join(tmpdir(), "ai-hub-tools-outside-"));
    try {
      await writeFile(join(outside, "secret.txt"), "secret");
      await symlink(join(outside, "secret.txt"), join(root, "escape.txt"), "file");
      await expect(readScopedFile(root, "escape.txt")).rejects.toThrow("tools:path_outside_root");
    } finally { await Promise.all([rm(root, { recursive: true, force: true }), rm(outside, { recursive: true, force: true })]); }
  });
});
