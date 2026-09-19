export const ARTIFACT_KINDS = ["mermaid", "html", "markdown", "code"] as const;

export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export const ARTIFACT_PROTOCOL = "ai-hub-artifact";

export const CODE_ARTIFACT_MIN_LINES = 12;
export const MARKDOWN_ARTIFACT_MIN_CHARS = 800;
export const FENCED_MARKDOWN_MIN_CHARS = 200;

export interface DetectedArtifact {
  kind: ArtifactKind;
  language: string | null;
  title: string;
  body: string;
}

const FENCE = /```([a-zA-Z0-9_+-]*)[ \t]*\r?\n([\s\S]*?)```/g;
const HTML_LANGS = new Set(["html", "htm", "svg"]);
const MARKDOWN_LANGS = new Set(["markdown", "md"]);

export function isArtifactKind(value: string): value is ArtifactKind {
  return (ARTIFACT_KINDS as readonly string[]).includes(value);
}

export function artifactFrameSrc(id: string): string {
  return `${ARTIFACT_PROTOCOL}://${id}/`;
}

export function detectArtifacts(content: string): DetectedArtifact[] {
  const found: DetectedArtifact[] = [];
  const consumed: Array<{ start: number; end: number }> = [];
  const fence = new RegExp(FENCE.source, "g");
  let match: RegExpExecArray | null = fence.exec(content);
  while (match) {
    const rawLang = (match[1] ?? "").toLowerCase();
    const body = (match[2] ?? "").replace(/\n$/, "");
    const start = match.index;
    const end = start + match[0].length;
    consumed.push({ start, end });
    const detected = classifyFence(rawLang, body);
    if (detected) {
      found.push(detected);
    }
    match = fence.exec(content);
  }
  const remainder = stripRanges(content, consumed).trim();
  if (remainder.length >= MARKDOWN_ARTIFACT_MIN_CHARS && looksLikeMarkdownDoc(remainder)) {
    found.push({
      kind: "markdown",
      language: null,
      title: artifactTitle("markdown", null, remainder),
      body: remainder,
    });
  }
  return found;
}

function classifyFence(lang: string, body: string): DetectedArtifact | null {
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (lang === "mermaid") {
    return {
      kind: "mermaid",
      language: null,
      title: artifactTitle("mermaid", null, body),
      body,
    };
  }
  if (HTML_LANGS.has(lang)) {
    return {
      kind: "html",
      language: lang === "svg" ? "svg" : "html",
      title: artifactTitle("html", lang, body),
      body,
    };
  }
  if (MARKDOWN_LANGS.has(lang) && trimmed.length >= FENCED_MARKDOWN_MIN_CHARS) {
    return {
      kind: "markdown",
      language: null,
      title: artifactTitle("markdown", null, body),
      body,
    };
  }
  const lines = body.split(/\r?\n/).length;
  if (!MARKDOWN_LANGS.has(lang) && lines >= CODE_ARTIFACT_MIN_LINES) {
    const language = lang.length > 0 ? lang.slice(0, 40) : null;
    return {
      kind: "code",
      language,
      title: artifactTitle("code", language, body),
      body,
    };
  }
  return null;
}

function looksLikeMarkdownDoc(text: string): boolean {
  return /^#{1,6}\s+\S/m.test(text) || text.split(/\r?\n/).length >= 20;
}

export function artifactTitle(kind: ArtifactKind, language: string | null, body: string): string {
  const heading = /^#{1,6}\s+(.+)$/m.exec(body);
  if (heading?.[1]) {
    return heading[1].trim().slice(0, 80);
  }
  if (kind === "mermaid") {
    return "Mermaid";
  }
  if (kind === "html") {
    return language === "svg" ? "SVG" : "HTML";
  }
  if (kind === "code") {
    return language ? language.slice(0, 40) : "Code";
  }
  return "Markdown";
}

function stripRanges(content: string, ranges: Array<{ start: number; end: number }>): string {
  if (ranges.length === 0) {
    return content;
  }
  const ordered = [...ranges].sort((a, b) => a.start - b.start);
  let cursor = 0;
  let out = "";
  for (const range of ordered) {
    out += content.slice(cursor, range.start);
    cursor = range.end;
  }
  out += content.slice(cursor);
  return out;
}
