import { inflateSync } from "node:zlib";
import { MAX_PDF_INFLATE_BYTES } from "./types";

function decodePdfLiteral(raw: string): string {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function literalsFrom(raw: string): string[] {
  const chunks: string[] = [];
  const tj = raw.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g);
  for (const match of tj) {
    const literal = match[1];
    if (literal) {
      chunks.push(decodePdfLiteral(literal));
    }
  }
  const arrays = raw.matchAll(/\[(.*?)\]\s*TJ/gs);
  for (const match of arrays) {
    const body = match[1] ?? "";
    const parts = body.matchAll(/\(((?:\\.|[^\\)])*)\)/g);
    for (const part of parts) {
      const literal = part[1];
      if (literal) {
        chunks.push(decodePdfLiteral(literal));
      }
    }
  }
  return chunks;
}

function inflateFlateStreams(latin1: string): string {
  const extras: string[] = [];
  const streamRe = /\/FlateDecode[\s\S]{0,400}stream\r?\n([\s\S]*?)endstream/g;
  for (const match of latin1.matchAll(streamRe)) {
    const payload = match[1];
    if (!payload) {
      continue;
    }
    try {
      extras.push(
        inflateSync(Buffer.from(payload, "latin1"), { maxOutputLength: MAX_PDF_INFLATE_BYTES }).toString(
          "latin1",
        ),
      );
    } catch {
      // ignore malformed streams
    }
  }
  return extras.join("\n");
}

export function extractPdfText(bytes: Uint8Array): string {
  const latin1 = Buffer.from(bytes).toString("latin1");
  const chunks = [
    ...literalsFrom(latin1),
    ...literalsFrom(inflateFlateStreams(latin1)),
  ];
  return chunks.join(" ").replace(/\s+/g, " ").trim();
}
