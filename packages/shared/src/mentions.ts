export const MENTION_TYPES = ["file", "conversation", "memory", "prompt", "skill", "packet"] as const;

export type MentionType = (typeof MENTION_TYPES)[number];

export const MENTION_STUB_TYPES = ["memory", "prompt", "skill"] as const;

export type MentionStubType = (typeof MENTION_STUB_TYPES)[number];

export const MAX_MENTIONS_PER_SEND = 8;
export const MAX_MENTION_TOKENS = 8_000;

const MENTION_TOKEN = /@([a-z]+):([^\s@]+)/gi;

export interface ParsedMention {
  type: MentionType;
  query: string;
  raw: string;
}

export interface MentionParseResult {
  mentions: ParsedMention[];
  body: string;
}

export function isMentionType(value: string): value is MentionType {
  return (MENTION_TYPES as readonly string[]).includes(value);
}

export function isMentionStubType(value: string): value is MentionStubType {
  return (MENTION_STUB_TYPES as readonly string[]).includes(value);
}

export function parseMentionTokens(text: string): MentionParseResult {
  const mentions: ParsedMention[] = [];
  const body = text.replace(MENTION_TOKEN, (raw, typeRaw: string, query: string) => {
    const type = typeRaw.toLowerCase();
    if (!isMentionType(type) || query.trim().length === 0) {
      return raw;
    }
    mentions.push({ type, query, raw });
    return " ";
  });
  return { mentions, body: body.replace(/\s+/g, " ").trim() };
}

export function mentionVisibleContent(text: string): string {
  const parsed = parseMentionTokens(text);
  if (parsed.body.length > 0) {
    return parsed.body;
  }
  return parsed.mentions.map((item) => item.raw).join(" ");
}

export function mentionTriggerIn(
  text: string,
  caret: number,
): { start: number; typed: string } | null {
  const clamped = Math.max(0, Math.min(caret, text.length));
  const before = text.slice(0, clamped);
  const at = before.lastIndexOf("@");
  if (at < 0) {
    return null;
  }
  const previous = at === 0 ? " " : before[at - 1];
  if (previous && !/\s/.test(previous)) {
    return null;
  }
  const typed = before.slice(at);
  if (typed.length === 0 || /\s/.test(typed)) {
    return null;
  }
  return { start: at, typed };
}

export function mentionTokenEstimate(chars: number): number {
  return Math.ceil(chars / 4);
}

export function mentionQueryParts(typed: string):
  | { kind: "types"; prefix: string }
  | { kind: "items"; type: MentionType; query: string } {
  const raw = typed.startsWith("@") ? typed.slice(1) : typed;
  const colon = raw.indexOf(":");
  if (colon < 0) {
    return { kind: "types", prefix: raw.toLowerCase() };
  }
  const type = raw.slice(0, colon).toLowerCase();
  if (!isMentionType(type)) {
    return { kind: "types", prefix: raw.toLowerCase() };
  }
  return { kind: "items", type, query: raw.slice(colon + 1) };
}
