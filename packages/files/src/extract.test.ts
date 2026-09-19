import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { classifyFileName, extractFile } from "./extract";
import { extractPdfText } from "./extract-pdf";

export function minimalPdf(text: string): Uint8Array {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const body = `${stream.length}\nstream\n${stream}\nendstream`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${stream.length} >> ${body} endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];
  const header = "%PDF-1.1\n";
  const joined = `${header}${objects.join("\n")}\n`;
  return Buffer.from(joined, "latin1");
}

describe("extractFile", () => {
  it("classifies common names", () => {
    expect(classifyFileName("notes.md")).toBe("text");
    expect(classifyFileName("data.csv")).toBe("csv");
    expect(classifyFileName("app.ts")).toBe("code");
    expect(classifyFileName("shot.png")).toBe("image");
    expect(classifyFileName("virus.exe")).toBe("unsupported");
  });

  it("extracts utf8 markdown and redacts nothing by itself", async () => {
    const result = await extractFile(Buffer.from("# Hello\nworld"), "readme.md");
    expect(result.kind).toBe("text");
    expect(result.text).toContain("Hello");
    expect(result.image).toBeNull();
  });

  it("extracts PDF literals used in the DoD fixture", async () => {
    const bytes = minimalPdf("Section 3: payments use PostgreSQL");
    expect(extractPdfText(bytes)).toContain("Section 3: payments use PostgreSQL");
    const result = await extractFile(bytes, "spec.pdf");
    expect(result.kind).toBe("pdf");
    expect(result.text).toContain("Section 3");
  });

  it("inflates FlateDecode streams before reading Tj literals", async () => {
    const stream = "BT /F1 12 Tf 72 720 Td (Section 3: payments use PostgreSQL) Tj ET";
    const compressed = deflateSync(Buffer.from(stream, "latin1"));
    const body = `stream\n${compressed.toString("latin1")}\nendstream`;
    const objects = [
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj",
      `4 0 obj << /Filter /FlateDecode /Length ${compressed.length} >> ${body} endobj`,
    ];
    const bytes = Buffer.from(`%PDF-1.1\n${objects.join("\n")}\n`, "latin1");
    expect(extractPdfText(bytes)).toContain("Section 3: payments use PostgreSQL");
    const result = await extractFile(bytes, "spec.pdf");
    expect(result.text).toContain("Section 3");
  });

  it("keeps image bytes as base64 and no text", async () => {
    const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 1]);
    const result = await extractFile(png, "dot.png");
    expect(result.kind).toBe("image");
    expect(result.text).toBe("");
    expect(result.image?.mime).toBe("image/png");
    expect(result.image?.data.length).toBeGreaterThan(0);
  });

  it("rejects empty and unknown types", async () => {
    await expect(extractFile(new Uint8Array(), "a.md")).rejects.toThrow("files:unsupported");
    await expect(extractFile(Buffer.from("x"), "a.bin")).rejects.toThrow("files:unsupported");
  });
});
