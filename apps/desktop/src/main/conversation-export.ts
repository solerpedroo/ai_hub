import { writeFile } from "node:fs/promises";
import { BrowserWindow, dialog, type WebContents } from "electron";
import { redactSecrets } from "@ai-hub/security";
import {
  selectExportMessages,
  branchLabelsSchema,
  conversationDtoSchema,
  conversationExportDocumentSchema,
  conversationExportResultSchema,
  type ConversationExportDocument,
  type ConversationExportInput,
  type ConversationExportResult,
  type MessageDto,
} from "@ai-hub/shared";
import { toMessageDto } from "./message-dto";
import { getHubDatabase } from "./persistence";

function filePart(title: string): string {
  const cleaned = Array.from(title)
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (code < 32 || '<>:"/\\|?*'.includes(ch)) {
        return "_";
      }
      return ch;
    })
    .join("")
    .trim();
  return (cleaned.length > 0 ? cleaned : "conversation").slice(0, 60);
}

export function buildConversationExportDocument(input: {
  mode: "active" | "tree";
  exportedAt: string;
  conversation: {
    id: string;
    projectId: string | null;
    title: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    importSource?: "chatgpt" | "claude" | "gemini" | null;
  };
  messages: MessageDto[];
  branchLabels: Record<string, string>;
}): ConversationExportDocument {
  const selected = selectExportMessages(input.mode, input.messages);
  return conversationExportDocumentSchema.parse({
    version: 1,
    mode: input.mode,
    exportedAt: input.exportedAt,
    conversation: conversationDtoSchema.parse({
      ...input.conversation,
      importSource: input.conversation.importSource ?? null,
    }),
    branchLabels: branchLabelsSchema.parse(input.branchLabels),
    messages: selected,
  });
}

export async function exportConversation(
  input: ConversationExportInput,
  sender: WebContents,
): Promise<ConversationExportResult> {
  const repos = getHubDatabase().repos;
  const conversation = repos.getConversation(input.conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const document = buildConversationExportDocument({
    mode: input.mode,
    exportedAt: new Date().toISOString(),
    conversation,
    messages: repos.listMessages(input.conversationId).map((row) => toMessageDto(row)),
    branchLabels: repos.getBranchLabels(input.conversationId),
  });
  const payload = redactSecrets(JSON.stringify(document, null, 2));

  const window = BrowserWindow.fromWebContents(sender);
  const options = {
    defaultPath: `${filePart(conversation.title)}-${input.mode}.json`,
    filters: [{ name: "JSON", extensions: ["json"] }],
  };
  const choice = window
    ? await dialog.showSaveDialog(window, options)
    : await dialog.showSaveDialog(options);
  if (choice.canceled || !choice.filePath) {
    return conversationExportResultSchema.parse({ status: "cancelled" });
  }

  await writeFile(choice.filePath, payload, "utf8");
  return conversationExportResultSchema.parse({ status: "saved", path: choice.filePath });
}
