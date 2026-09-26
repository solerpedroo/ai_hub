import { describe, expect, it } from "vitest";
import { extensionManifestSchema } from "./extensions";

describe("extension manifest", () => {
  it("accepts a versioned core-only read manifest", () => {
    expect(extensionManifestSchema.parse({ apiVersion: 1, id: "ai-hub.project-files", version: "1.0.0", kind: "mcp", name: "Project Files", description: "Read scoped files", permissions: [{ toolId: "project-filesystem.read-file", operation: "read", effect: "read" }], sandbox: "core" }).id).toBe("ai-hub.project-files");
  });

  it("rejects executable and network escape hatches", () => {
    expect(() => extensionManifestSchema.parse({ apiVersion: 1, id: "ai-hub.project-files", version: "1.0.0", kind: "mcp", name: "Project Files", description: "Read scoped files", permissions: [], sandbox: "core", command: "npx" })).toThrow();
    expect(() => extensionManifestSchema.parse({ apiVersion: 1, id: "ai-hub.project-files", version: "1.0.0", kind: "mcp", name: "Project Files", description: "Read scoped files", permissions: [], sandbox: "renderer" })).toThrow();
  });
});
