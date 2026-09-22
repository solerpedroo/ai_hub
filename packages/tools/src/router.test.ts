import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ToolRouter } from "./router";
import { PROJECT_FILESYSTEM_TOOL_ID, type ProjectToolStore } from "./types";

function store(rootPath: string): ProjectToolStore & { grants: Set<string> } {
  const grants = new Set<string>();
  return {
    grants,
    getProjectToolRoot: () => ({ rootPath }),
    hasProjectToolPermission: (projectId, toolId, operation) => grants.has(`${projectId}:${toolId}:${operation}`),
    grantProjectToolPermission: (projectId, toolId, operation) => { grants.add(`${projectId}:${toolId}:${operation}`); },
  };
}

describe("ToolRouter permission center", () => {
  it("does not execute on deny, consumes one-time approval, and scopes persistent grants to a project", async () => {
    const root = await mkdtemp(join(tmpdir(), "ai-hub-router-"));
    try {
      await writeFile(join(root, "readme.txt"), "safe output");
      const backing = store(root);
      const router = new ToolRouter(backing);
      const requested = await router.request({ projectId: "project-a", toolId: PROJECT_FILESYSTEM_TOOL_ID, relativePath: "readme.txt" }, 10);
      if (!("requiresDestructiveConfirmation" in requested)) throw new Error("Expected permission");
      await expect(router.decide(requested.id, "deny", 10)).resolves.toMatchObject({ status: "denied" });
      const once = await router.request({ projectId: "project-a", toolId: PROJECT_FILESYSTEM_TOOL_ID, relativePath: "readme.txt" }, 10);
      if (!("requiresDestructiveConfirmation" in once)) throw new Error("Expected permission");
      await expect(router.decide(once.id, "allow_once", 10)).resolves.toMatchObject({ output: "safe output" });
      expect(backing.grants.size).toBe(0);
      const always = await router.request({ projectId: "project-a", toolId: PROJECT_FILESYSTEM_TOOL_ID, relativePath: "readme.txt" }, 10);
      if (!("requiresDestructiveConfirmation" in always)) throw new Error("Expected permission");
      await router.decide(always.id, "allow_project", 10);
      await expect(router.request({ projectId: "project-a", toolId: PROJECT_FILESYSTEM_TOOL_ID, relativePath: "readme.txt" }, 10)).resolves.toMatchObject({ output: "safe output" });
      await expect(router.request({ projectId: "project-b", toolId: PROJECT_FILESYSTEM_TOOL_ID, relativePath: "readme.txt" }, 10)).resolves.toMatchObject({ requiresDestructiveConfirmation: false });
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("binds a pending permission request to its renderer", async () => {
    const root = await mkdtemp(join(tmpdir(), "ai-hub-router-"));
    try {
      await writeFile(join(root, "readme.txt"), "safe output");
      const router = new ToolRouter(store(root));
      const requested = await router.request({ projectId: "project-a", toolId: PROJECT_FILESYSTEM_TOOL_ID, relativePath: "readme.txt" }, 10);
      if (!("requiresDestructiveConfirmation" in requested)) throw new Error("Expected permission");
      await expect(router.decide(requested.id, "allow_once", 11)).rejects.toThrow("tools:permission_not_found");
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
