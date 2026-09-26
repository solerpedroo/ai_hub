import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  installed: false,
  rootPath: "",
  grants: new Set<string>(),
  showMessageBox: vi.fn(),
}));

vi.mock("electron", () => ({
  BrowserWindow: { fromWebContents: () => null },
  dialog: { showMessageBox: fixture.showMessageBox },
}));
vi.mock("./marketplace-packs", () => ({ projectFilesPackInstalled: () => fixture.installed }));
vi.mock("./persistence", () => ({
  getHubDatabase: () => ({
    repos: {
      getProjectToolRoot: () => ({ rootPath: fixture.rootPath }),
      hasProjectToolPermission: (projectId: string, toolId: string, operation: string) => fixture.grants.has(`${projectId}:${toolId}:${operation}`),
      grantProjectToolPermission: (projectId: string, toolId: string, operation: string) => fixture.grants.add(`${projectId}:${toolId}:${operation}`),
      getAppearance: () => ({ locale: "en" }),
    },
  }),
}));

import { requestToolRead } from "./tools";

describe("marketplace Project Files pack", () => {
  beforeEach(() => {
    fixture.installed = false;
    fixture.grants.clear();
    fixture.showMessageBox.mockReset();
  });

  it("blocks reads until installed, then keeps the Permission Center in the read path", async () => {
    const root = await mkdtemp(join(tmpdir(), "ai-hub-marketplace-"));
    fixture.rootPath = root;
    try {
      await writeFile(join(root, "README.md"), "only scoped project content");
      const sender = { id: 41 } as Electron.WebContents;
      await expect(requestToolRead({ projectId: "project-a", relativePath: "README.md" }, sender)).rejects.toThrow("marketplace:pack_not_installed");

      fixture.installed = true;
      fixture.showMessageBox.mockResolvedValue({ response: 0 });
      await expect(requestToolRead({ projectId: "project-a", relativePath: "README.md" }, sender)).resolves.toMatchObject({
        kind: "completed",
        content: "only scoped project content",
      });
      expect(fixture.showMessageBox).toHaveBeenCalledOnce();
      expect(fixture.grants).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
