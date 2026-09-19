import mammoth from "mammoth";
import { extractPdfText } from "./extract-pdf";
import {
  MAX_EXTRACT_CHARS,
  MAX_FILE_BYTES,
  type ExtractResult,
  type FileKind,
  type ImageMime,
} from "./types";

const IMAGE_EXT: Record<string, ImageMime> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const CODE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".rs",
  ".go",
  ".java",
  ".kt",
  ".swift",
  ".rb",
  ".php",
  ".cs",
  ".cpp",
  ".c",
  ".h",
  ".hpp",
  ".json",
  ".yml",
  ".yaml",
  ".toml",
  ".html",
  ".css",
  ".scss",
  ".sql",
  ".sh",
  ".ps1",
]);

function extensionOf(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function clip(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_EXTRACT_CHARS) {
    return { text, truncated: false };
  }
  return { text: text.slice(0, MAX_EXTRACT_CHARS), truncated: true };
}

function decodeText(bytes: Uint8Array): string {
  const sample = bytes.subarray(0, Math.min(bytes.length, 800));
  let zeros = 0;
  for (const byte of sample) {
    if (byte === 0) {
      zeros += 1;
    }
  }
  if (zeros > 8) {
    throw new Error("files:unsupported");
  }
  return Buffer.from(bytes).toString("utf8").replace(/^\uFEFF/, "");
}

export function classifyFileName(fileName: string): FileKind | "unsupported" {
  const ext = extensionOf(fileName);
  if (ext === ".pdf") {
    return "pdf";
  }
  if (ext === ".docx") {
    return "docx";
  }
  if (ext === ".csv") {
    return "csv";
  }
  if (ext === ".txt" || ext === ".md" || ext === ".markdown") {
    return "text";
  }
  if (IMAGE_EXT[ext]) {
    return "image";
  }
  if (CODE_EXT.has(ext)) {
    return "code";
  }
  return "unsupported";
}

export async function extractFile(bytes: Uint8Array, fileName: string): Promise<ExtractResult> {
  if (bytes.byteLength === 0) {
    throw new Error("files:unsupported");
  }
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new Error("files:too_large");
  }
  const kind = classifyFileName(fileName);
  if (kind === "unsupported") {
    throw new Error("files:unsupported");
  }
  if (kind === "image") {
    const ext = extensionOf(fileName);
    const mime = IMAGE_EXT[ext];
    if (!mime) {
      throw new Error("files:unsupported");
    }
    return {
      kind,
      text: "",
      truncated: false,
      mime,
      image: { mime, data: Buffer.from(bytes).toString("base64") },
    };
  }
  if (kind === "pdf") {
    const clipped = clip(extractPdfText(bytes));
    return { kind, text: clipped.text, truncated: clipped.truncated, mime: "application/pdf", image: null };
  }
  if (kind === "docx") {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    const clipped = clip(result.value.trim());
    return {
      kind,
      text: clipped.text,
      truncated: clipped.truncated,
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      image: null,
    };
  }
  const clipped = clip(decodeText(bytes));
  const mime = kind === "csv" ? "text/csv" : "text/plain";
  return { kind, text: clipped.text, truncated: clipped.truncated, mime, image: null };
}
