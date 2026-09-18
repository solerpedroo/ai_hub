import { IMPORT_ATTACHMENT_PLACEHOLDER, asRecord, asString, unixToMs, type NormalizedImportConversation } from "./types";

function extractPartText(part: unknown): { text: string; skippedAttachment: boolean } {
  if (typeof part === "string") {
    return { text: part, skippedAttachment: false };
  }
  const record = asRecord(part);
  if (!record) {
    return { text: "", skippedAttachment: true };
  }
  if (typeof record === "object" && "asset_pointer" in record) {
    return { text: "", skippedAttachment: true };
  }
  const contentType = asString(record.content_type);
  if (contentType && contentType !== "text") {
    return { text: "", skippedAttachment: true };
  }
  if (typeof record.text === "string") {
    return { text: record.text, skippedAttachment: false };
  }
  return { text: "", skippedAttachment: Boolean(contentType) };
}

function pickCurrentNode(mapping: Record<string, unknown>, declared: string | null): string | null {
  if (declared && mapping[declared]) {
    return declared;
  }
  const parentIds = new Set<string>();
  for (const value of Object.values(mapping)) {
    const record = asRecord(value);
    const parent = record ? asString(record.parent) : null;
    if (parent) {
      parentIds.add(parent);
    }
  }
  let best: string | null = null;
  let bestTime = Number.NEGATIVE_INFINITY;
  for (const [id, value] of Object.entries(mapping)) {
    if (parentIds.has(id)) {
      continue;
    }
    const record = asRecord(value);
    const message = record ? asRecord(record.message) : null;
    const time = message ? unixToMs(message.create_time, 0) : 0;
    if (time >= bestTime) {
      bestTime = time;
      best = id;
    }
  }
  return best;
}

function walkActivePath(
  mapping: Record<string, unknown>,
  currentNode: string | null,
): unknown[] {
  const ordered: unknown[] = [];
  const seen = new Set<string>();
  let cursor = currentNode;
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const node = mapping[cursor];
    ordered.push(node);
    const record = asRecord(node);
    const parent = record ? asString(record.parent) : null;
    cursor = parent;
  }
  return ordered.reverse();
}

export function parseChatGptConversations(payload: unknown): NormalizedImportConversation[] {
  const list = Array.isArray(payload)
    ? payload
    : asRecord(payload) && Array.isArray(asRecord(payload)?.conversations)
      ? (asRecord(payload)?.conversations as unknown[])
      : null;
  if (!list) {
    return [];
  }
  const now = Date.now();
  const result: NormalizedImportConversation[] = [];
  for (const item of list) {
    const conversation = asRecord(item);
    if (!conversation) {
      continue;
    }
    const mappingRaw = asRecord(conversation.mapping);
    if (!mappingRaw) {
      continue;
    }
    const externalId =
      asString(conversation.conversation_id) ?? asString(conversation.id) ?? asString(conversation.conversationId);
    if (!externalId) {
      continue;
    }
    const createdAtMs = unixToMs(conversation.create_time, now);
    const updatedAtMs = unixToMs(conversation.update_time, createdAtMs);
    const title = asString(conversation.title)?.slice(0, 200) ?? "Imported chat";
    const currentNode = pickCurrentNode(mappingRaw, asString(conversation.current_node));
    const nodes = walkActivePath(mappingRaw, currentNode);
    const messages: NormalizedImportConversation["messages"] = [];
    for (const node of nodes) {
      const record = asRecord(node);
      const message = record ? asRecord(record.message) : null;
      if (!message) {
        continue;
      }
      const author = asRecord(message.author);
      const roleRaw = author ? asString(author.role) : null;
      if (roleRaw === "tool" || roleRaw === "system") {
        const metadata = asRecord(message.metadata);
        if (roleRaw === "system" && metadata?.is_user_system_message !== true) {
          continue;
        }
        if (roleRaw === "tool") {
          continue;
        }
      }
      const role = roleRaw === "assistant" || roleRaw === "system" ? roleRaw : "user";
      const content = asRecord(message.content);
      const parts = content && Array.isArray(content.parts) ? content.parts : [];
      let text = "";
      let skippedAttachment = false;
      if (parts.length === 0 && typeof content?.text === "string") {
        text = content.text;
      }
      for (const part of parts) {
        const extracted = extractPartText(part);
        if (extracted.skippedAttachment) {
          skippedAttachment = true;
        }
        if (extracted.text.length > 0) {
          text = text.length > 0 ? `${text}\n${extracted.text}` : extracted.text;
        }
      }
      if (skippedAttachment) {
        text = text.length > 0 ? `${text}\n\n${IMPORT_ATTACHMENT_PLACEHOLDER}` : IMPORT_ATTACHMENT_PLACEHOLDER;
      }
      if (text.trim().length === 0) {
        continue;
      }
      messages.push({
        role,
        content: text,
        createdAtMs: unixToMs(message.create_time, createdAtMs),
        skippedAttachment,
      });
    }
    if (messages.length === 0) {
      continue;
    }
    result.push({
      source: "chatgpt",
      externalId,
      title,
      createdAtMs,
      updatedAtMs,
      messages,
    });
  }
  return result;
}
