import { describe, expect, it } from "vitest";
import {
  CODE_ARTIFACT_MIN_LINES,
  detectArtifacts,
  artifactFrameSrc,
  MARKDOWN_ARTIFACT_MIN_CHARS,
} from "./artifacts";

describe("detectArtifacts", () => {
  it("extracts a mermaid fence regardless of size", () => {
    const found = detectArtifacts("See this.\n\n```mermaid\nflowchart LR\n  A --> B\n```\n");
    expect(found).toEqual([
      {
        kind: "mermaid",
        language: null,
        title: "Mermaid",
        body: "flowchart LR\n  A --> B",
      },
    ]);
  });

  it("extracts html and long code fences, and a leftover markdown doc", () => {
    const codeLines = Array.from({ length: CODE_ARTIFACT_MIN_LINES }, (_, index) => `const n${index} = ${index};`);
    const heading = "# Architecture\n\n";
    const prose = "x".repeat(MARKDOWN_ARTIFACT_MIN_CHARS);
    const content = `${heading}${prose}\n\n\`\`\`html\n<div>Hi</div>\n\`\`\`\n\n\`\`\`ts\n${codeLines.join("\n")}\n\`\`\`\n`;
    const found = detectArtifacts(content);
    expect(found.map((item) => item.kind)).toEqual(["html", "code", "markdown"]);
    expect(found[0]?.body).toContain("<div>Hi</div>");
    expect(found[1]?.language).toBe("ts");
    expect(found[2]?.title).toBe("Architecture");
  });

  it("ignores tiny code fences and short prose", () => {
    expect(detectArtifacts("Hello from mock")).toEqual([]);
    expect(detectArtifacts("```ts\nconst x = 1;\n```")).toEqual([]);
    const unlabeled = Array.from({ length: CODE_ARTIFACT_MIN_LINES }, (_, index) => `line ${index}`).join("\n");
    expect(detectArtifacts(`\`\`\`\n${unlabeled}\n\`\`\``)[0]?.kind).toBe("code");
  });
});

describe("artifactFrameSrc", () => {
  it("uses a unique host per artifact id", () => {
    expect(artifactFrameSrc("11111111-1111-4111-8111-111111111111")).toBe(
      "ai-hub-artifact://11111111-1111-4111-8111-111111111111/",
    );
  });
});
