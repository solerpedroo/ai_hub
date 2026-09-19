import { describe, expect, it } from "vitest";
import { summarizeFolder } from "./folder-summary";

describe("summarizeFolder", () => {
  it("detects a Node stack from package.json and README", () => {
    const summary = summarizeFolder({
      rootName: "demo",
      files: [
        {
          relativePath: "package.json",
          content: JSON.stringify({
            name: "demo-app",
            packageManager: "pnpm@10.0.0",
            dependencies: { react: "19.0.0" },
          }),
        },
        { relativePath: "README.md", content: "Hello Node workspace" },
        { relativePath: "src/index.ts", content: "export {}" },
        { relativePath: "pnpm-lock.yaml", content: "lockfileVersion: 9" },
      ],
    });
    expect(summary.stack).toBe("Node.js");
    expect(summary.text).toContain("Stack: Node.js");
    expect(summary.text).toContain("Package manager: pnpm");
    expect(summary.text).toContain("react");
    expect(summary.text).toContain("Hello Node workspace");
    expect(summary.text).toContain("src");
  });
});
