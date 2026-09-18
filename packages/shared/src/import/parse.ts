import { parseChatGptConversations } from "./chatgpt";
import { parseClaudeConversations } from "./claude";
import { parseGeminiActivities } from "./gemini";
import { ImportParseError, type ImportSource, type NormalizedImportConversation } from "./types";
import { isZipBuffer, unzipUtf8Files } from "./zip";

function looksLikeHtml(text: string): boolean {
  const head = text.slice(0, 200).trim().toLowerCase();
  return head.startsWith("<!doctype html") || head.startsWith("<html") || head.includes("<body");
}

function parseJsonDocument(text: string): unknown {
  const trimmed = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new ImportParseError("invalid_json", "Invalid JSON");
  }
}

function jsonFilesFromArchive(bytes: Uint8Array): string[] {
  if (!isZipBuffer(bytes)) {
    return [new TextDecoder("utf8").decode(bytes)];
  }
  const files = unzipUtf8Files(bytes);
  const jsonFiles = files
    .filter((file) => file.name.toLowerCase().endsWith(".json"))
    .sort((left, right) => left.name.localeCompare(right.name));
  if (jsonFiles.length === 0) {
    throw new ImportParseError("unrecognized", "ZIP has no JSON files");
  }
  return jsonFiles.map((file) => file.text);
}

function parseOne(source: ImportSource, payload: unknown): NormalizedImportConversation[] {
  if (source === "chatgpt") {
    return parseChatGptConversations(payload);
  }
  if (source === "claude") {
    return parseClaudeConversations(payload);
  }
  return parseGeminiActivities(payload);
}

export function parseImportBytes(source: ImportSource, bytes: Uint8Array): NormalizedImportConversation[] {
  const texts = jsonFilesFromArchive(bytes);
  if (texts.some((text) => looksLikeHtml(text))) {
    throw new ImportParseError("gemini_html", "HTML Takeout is not supported");
  }
  const conversations: NormalizedImportConversation[] = [];
  const seen = new Set<string>();
  for (const text of texts) {
    const payload = parseJsonDocument(text);
    for (const conversation of parseOne(source, payload)) {
      const key = `${conversation.source}:${conversation.externalId}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      conversations.push(conversation);
    }
  }
  if (conversations.length === 0) {
    throw new ImportParseError("empty", "No conversations found");
  }
  return conversations;
}
