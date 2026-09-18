import {
  IMPORT_ATTACHMENT_PLACEHOLDER,
  asRecord,
  asString,
  fnv1aHex,
  unixToMs,
  type NormalizedImportConversation,
} from "./types";

function conversationIdFromUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter((part) => part.length > 0);
    const appIndex = parts.lastIndexOf("app");
    const appId = parts[appIndex + 1];
    if (appIndex >= 0 && appId) {
      return appId;
    }
    const gemIndex = parts.lastIndexOf("gem");
    const gemId = parts[gemIndex + 1];
    if (gemIndex >= 0 && gemId) {
      return gemId;
    }
    return parts.at(-1) ?? null;
  } catch {
    const match = /\/(?:app|gem)\/([^/?#]+)/.exec(url);
    return match?.[1] ?? null;
  }
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseInteractionPayload(raw: unknown): { request: string; response: string; skippedAttachment: boolean } {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { request: "", response: "", skippedAttachment: false };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const record = asRecord(parsed);
    if (!record) {
      return { request: stripHtml(raw), response: "", skippedAttachment: false };
    }
    const request = asString(record.text) ?? asString(record.prompt) ?? asString(record.request) ?? "";
    const response = asString(record.response) ?? asString(record.answer) ?? "";
    return { request, response, skippedAttachment: false };
  } catch {
    return { request: stripHtml(raw), response: "", skippedAttachment: false };
  }
}

export function parseGeminiActivities(payload: unknown): NormalizedImportConversation[] {
  const list = Array.isArray(payload)
    ? payload
    : asRecord(payload) && Array.isArray(asRecord(payload)?.["My Activity"])
      ? (asRecord(payload)?.["My Activity"] as unknown[])
      : null;
  if (!list) {
    return [];
  }
  const groups = new Map<string, NormalizedImportConversation>();
  const now = Date.now();
  for (const item of list) {
    const record = asRecord(item);
    if (!record) {
      continue;
    }
    const header = asString(record.header)?.toLowerCase() ?? "";
    const products = Array.isArray(record.products) ? record.products.map((value) => String(value).toLowerCase()) : [];
    const looksGemini =
      header.includes("gemini") ||
      products.some((product) => product.includes("gemini")) ||
      (asString(record.titleUrl) ?? "").includes("gemini.google.com");
    if (!looksGemini && header.length > 0 && !header.includes("bard")) {
      continue;
    }
    const titleUrl = asString(record.titleUrl);
    const timeMs = unixToMs(record.time, now);
    const titleText = stripHtml(asString(record.title) ?? "Imported chat").slice(0, 200);
    const externalId = conversationIdFromUrl(titleUrl) ?? `derived:${fnv1aHex(`${titleText}|${timeMs}`)}`;
    let userText = titleText.replace(/^prompt:\s*/i, "");
    let assistantText = "";
    let skippedAttachment = false;
    const subtitles = Array.isArray(record.subtitles) ? record.subtitles : [];
    for (const subtitle of subtitles) {
      const sub = asRecord(subtitle);
      if (!sub) {
        continue;
      }
      const name = asString(sub.name);
      if (name) {
        assistantText = assistantText.length > 0 ? `${assistantText}\n${stripHtml(name)}` : stripHtml(name);
      }
    }
    const interactions = Array.isArray(record.userInteractions) ? record.userInteractions : [];
    for (const interaction of interactions) {
      const wrapped = asRecord(interaction);
      const payloadRaw = wrapped?.userInteraction ?? wrapped?.request ?? interaction;
      if (typeof payloadRaw === "string") {
        const parsed = parseInteractionPayload(payloadRaw);
        if (parsed.request.length > 0) {
          userText = parsed.request;
        }
        if (parsed.response.length > 0) {
          assistantText = parsed.response;
        }
      } else {
        const inner = asRecord(payloadRaw);
        if (inner) {
          const request = asString(inner.request) ?? asString(inner.text);
          const response = asString(inner.response);
          if (request) {
            userText = request;
          }
          if (response) {
            assistantText = response;
          }
        }
      }
    }
    if (Array.isArray(record.imageViews) && record.imageViews.length > 0) {
      skippedAttachment = true;
      assistantText =
        assistantText.length > 0 ? `${assistantText}\n\n${IMPORT_ATTACHMENT_PLACEHOLDER}` : IMPORT_ATTACHMENT_PLACEHOLDER;
    }
    const existing = groups.get(externalId);
    const conversation =
      existing ??
      ({
        source: "gemini",
        externalId,
        title: userText.slice(0, 200) || "Imported chat",
        createdAtMs: timeMs,
        updatedAtMs: timeMs,
        messages: [],
      } satisfies NormalizedImportConversation);
    if (userText.trim().length > 0) {
      conversation.messages.push({
        role: "user",
        content: userText,
        createdAtMs: timeMs,
        skippedAttachment: false,
      });
    }
    if (assistantText.trim().length > 0) {
      conversation.messages.push({
        role: "assistant",
        content: assistantText,
        createdAtMs: timeMs + 1,
        skippedAttachment,
      });
    }
    conversation.updatedAtMs = Math.max(conversation.updatedAtMs, timeMs);
    conversation.createdAtMs = Math.min(conversation.createdAtMs, timeMs);
    groups.set(externalId, conversation);
  }
  return [...groups.values()].filter((conversation) => conversation.messages.length > 0);
}
