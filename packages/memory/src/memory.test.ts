import { describe, expect, it } from "vitest";
import { chunkText } from "./chunk";
import { cosineSimilarity, embedText } from "./embed";
import { retrieveChunks } from "./retrieve";
import { allowsProjectContext } from "./privacy";
import { suggestMemories } from "./suggest";
import { buildWorkspaceSnapshot } from "./workspace";

describe("chunkText", () => {
  it("splits long extracts and keeps order", () => {
    const text = `${"alpha ".repeat(400)}\n\n${"beta ".repeat(400)}`;
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.text).toContain("alpha");
    expect(chunks.at(-1)?.text).toContain("beta");
  });
});

describe("retrieveChunks", () => {
  it("ranks the matching PDF chunk first", () => {
    const postgres = embedText("Section 3 payments use PostgreSQL and Flyway");
    const rust = embedText("The CLI is written in Rust and Tokio");
    const hits = retrieveChunks("which database do payments use?", [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        fileId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        fileName: "payments.pdf",
        chunkIndex: 0,
        text: "Section 3 payments use PostgreSQL and Flyway",
        embedding: postgres,
        tokenEstimate: 20,
      },
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        fileId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        fileName: "cli.pdf",
        chunkIndex: 0,
        text: "The CLI is written in Rust and Tokio",
        embedding: rust,
        tokenEstimate: 16,
      },
    ]);
    expect(hits[0]?.fileName).toBe("payments.pdf");
    expect(hits[0]?.score ?? 0).toBeGreaterThan(cosineSimilarity(postgres, rust));
  });
});

describe("allowsProjectContext", () => {
  it("excludes memories and RAG in strict privacy", () => {
    expect(allowsProjectContext("standard")).toBe(true);
    expect(allowsProjectContext("strict")).toBe(false);
  });
});

describe("suggestMemories", () => {
  it("picks a PostgreSQL fact", () => {
    const suggestions = suggestMemories("Neste sprint decidimos a stack. Usamos PostgreSQL no backend.");
    expect(suggestions.some((item) => /postgresql/i.test(item))).toBe(true);
  });
});

describe("buildWorkspaceSnapshot", () => {
  it("builds a local summary from the path and pins", () => {
    const snap = buildWorkspaceSnapshot([
      { role: "user", content: "qual banco usamos?", pinned: false },
      { role: "assistant", content: "Usamos PostgreSQL.\nTODO: documentar o schema", pinned: true },
    ]);
    expect(snap.summary).toContain("qual banco");
    expect(snap.summary).toContain("PostgreSQL");
    expect(snap.decisions.some((item) => /postgresql/i.test(item))).toBe(true);
    expect(snap.taskCandidates.some((item) => /schema/i.test(item))).toBe(true);
  });
});
