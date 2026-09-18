import { IMPORT_ATTACHMENT_PLACEHOLDER, asRecord, asString, unixToMs, type NormalizedImportConversation } from "./types";

function textFromBlocks(value: unknown): { text: string; skippedAttachment: boolean } {
  if (typeof value === "string") {
    return { text: value, skippedAttachment: false };
  }
  if (!Array.isArray(value)) {
    return { text: "", skippedAttachment: false };
  }
  const chunks: string[] = [];
  let skippedAttachment = false;
  for (const block of value) {
    const record = asRecord(block);
    if (!record) {
      continue;
    }
    const type = asString(record.type);
    if (type === "text" && typeof record.text === "string") {
      chunks.push(record.text);
      continue;
    }
    if (type === "thinking" || type === "tool_use" || type === "tool_result") {
      continue;
    }
    if (type && type !== "text") {
      skippedAttachment = true;
    }
  }
  return { text: chunks.join("\n"), skippedAttachment };
}

function asClaudeList(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) {
    return payload;
  }
  const record = asRecord(payload);
  if (!record) {
    return null;
  }
  if (Array.isArray(record.conversations)) {
    return record.conversations;
  }
  if (Array.isArray(record.chat_messages) || asString(record.uuid) || asString(record.id)) {
    return [record];
  }
  return null;
}

export function parseClaudeConversations(payload: unknown): NormalizedImportConversation[] {
  const list = asClaudeList(payload);
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
    const externalId = asString(conversation.uuid) ?? asString(conversation.id);
    if (!externalId) {
      continue;
    }
    const createdAtMs = unixToMs(conversation.created_at, now);
    const updatedAtMs = unixToMs(conversation.updated_at, createdAtMs);
    const title = asString(conversation.name)?.slice(0, 200) ?? asString(conversation.title)?.slice(0, 200) ?? "Imported chat";
    const rawMessages = Array.isArray(conversation.chat_messages) ? conversation.chat_messages : [];
    const messages: NormalizedImportConversation["messages"] = [];
    for (const raw of rawMessages) {
      const message = asRecord(raw);
      if (!message) {
        continue;
      }
      const sender = asString(message.sender);
      const role = sender === "assistant" ? "assistant" : sender === "human" || sender === "user" ? "user" : null;
      if (!role) {
        continue;
      }
      const fromText = typeof message.text === "string" ? message.text : "";
      const fromBlocks = textFromBlocks(message.content);
      let text = fromText.trim().length > 0 ? fromText : fromBlocks.text;
      const hasFiles =
        (Array.isArray(message.attachments) && message.attachments.length > 0) ||
        (Array.isArray(message.files) && message.files.length > 0) ||
        (Array.isArray(message.files_v2) && message.files_v2.length > 0);
      const skippedAttachment = fromBlocks.skippedAttachment || hasFiles;
      if (skippedAttachment) {
        text = text.length > 0 ? `${text}\n\n${IMPORT_ATTACHMENT_PLACEHOLDER}` : IMPORT_ATTACHMENT_PLACEHOLDER;
      }
      if (text.trim().length === 0) {
        continue;
      }
      messages.push({
        role,
        content: text,
        createdAtMs: unixToMs(message.created_at, createdAtMs),
        skippedAttachment,
      });
    }
    if (messages.length === 0) {
      continue;
    }
    result.push({
      source: "claude",
      externalId,
      title,
      createdAtMs,
      updatedAtMs,
      messages,
    });
  }
  return result;
}
