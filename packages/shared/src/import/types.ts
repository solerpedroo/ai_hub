export const IMPORT_SOURCES = ["chatgpt", "claude", "gemini"] as const;

export type ImportSource = (typeof IMPORT_SOURCES)[number];

export const IMPORT_ATTACHMENT_PLACEHOLDER = "[file not imported]";

export interface NormalizedImportMessage {
  role: "user" | "assistant" | "system";
  content: string;
  createdAtMs: number;
  skippedAttachment: boolean;
}

export interface NormalizedImportConversation {
  source: ImportSource;
  externalId: string;
  title: string;
  createdAtMs: number;
  updatedAtMs: number;
  messages: NormalizedImportMessage[];
}

export type ImportParseErrorCode = "invalid_json" | "unrecognized" | "gemini_html" | "empty";

export class ImportParseError extends Error {
  readonly code: ImportParseErrorCode;

  constructor(code: ImportParseErrorCode, message: string) {
    super(message);
    this.name = "ImportParseError";
    this.code = code;
  }
}

export function isImportSource(value: string): value is ImportSource {
  return (IMPORT_SOURCES as readonly string[]).includes(value);
}

export function unixToMs(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? Math.trunc(value) : Math.trunc(value * 1000);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && asNumber > 0) {
      return unixToMs(asNumber, fallback);
    }
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function fnv1aHex(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
