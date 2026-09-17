import { ipcMain } from "electron";
import { ZodError, type ZodType } from "zod";
import {
  IpcChannel,
  appearanceSettingsSchema,
  chatAbortInputSchema,
  chatSendInputSchema,
  chatSendResultSchema,
  conversationCreateInputSchema,
  conversationDtoSchema,
  conversationListInputSchema,
  conversationListResultSchema,
  emptyIpcPayloadSchema,
  idInputSchema,
  ipcAckResultSchema,
  messageCreateInputSchema,
  messageDtoSchema,
  messageListInputSchema,
  messageListResultSchema,
  messageUpdateInputSchema,
  projectCreateInputSchema,
  projectDtoSchema,
  projectListResultSchema,
  providerKeyDtoSchema,
  providerKeyListResultSchema,
  providerListResultSchema,
  secretsSaveInputSchema,
  windowIsMaximizedResultSchema,
  workspaceSessionSchema,
} from "@ai-hub/shared";
import { safeErrorMessage } from "@ai-hub/security";
import { abortChat, sendChat } from "./chat-session";
import { toMessageDto } from "./message-dto";
import { getHubDatabase } from "./persistence";

function registerHandler<TIn, TOut>(
  channel: string,
  inputSchema: ZodType<TIn>,
  outputSchema: ZodType<TOut>,
  handler: (input: TIn, event: Electron.IpcMainInvokeEvent) => TOut | Promise<TOut>,
): void {
  ipcMain.handle(channel, async (event, payload: unknown) => {
    try {
      const input = inputSchema.parse(payload ?? {});
      const output = await handler(input, event);
      return outputSchema.parse(output);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new Error("Invalid request");
      }
      throw new Error(safeErrorMessage(error));
    }
  });
}

export function registerWorkspaceIpc(): void {
  registerHandler(IpcChannel.projectsList, emptyIpcPayloadSchema, projectListResultSchema, () =>
    getHubDatabase().repos.listProjects().map((row) => projectDtoSchema.parse(row)),
  );

  registerHandler(IpcChannel.projectsCreate, projectCreateInputSchema, projectDtoSchema, (input) =>
    projectDtoSchema.parse(getHubDatabase().repos.createProject(input.name)),
  );

  registerHandler(IpcChannel.projectsRemove, idInputSchema, ipcAckResultSchema, (input) => {
    getHubDatabase().repos.removeProject(input.id);
  });

  registerHandler(
    IpcChannel.conversationsList,
    conversationListInputSchema,
    conversationListResultSchema,
    (input) =>
      getHubDatabase()
        .repos.listConversations(input.projectId)
        .map((row) => conversationDtoSchema.parse(row)),
  );

  registerHandler(
    IpcChannel.conversationsCreate,
    conversationCreateInputSchema,
    conversationDtoSchema,
    (input) => conversationDtoSchema.parse(getHubDatabase().repos.createConversation(input.projectId, input.title)),
  );

  registerHandler(IpcChannel.conversationsRemove, idInputSchema, ipcAckResultSchema, (input) => {
    getHubDatabase().repos.removeConversation(input.id);
  });

  registerHandler(IpcChannel.messagesList, messageListInputSchema, messageListResultSchema, (input) =>
    getHubDatabase()
      .repos.listMessages(input.conversationId)
      .map((row) => toMessageDto(row)),
  );

  registerHandler(IpcChannel.messagesCreate, messageCreateInputSchema, messageDtoSchema, (input) =>
    toMessageDto(
      getHubDatabase().repos.createMessage({
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        parentId: input.parentId,
        branchId: input.branchId,
      }),
    ),
  );

  registerHandler(IpcChannel.messagesUpdate, messageUpdateInputSchema, messageDtoSchema, (input) => {
    const existing = getHubDatabase().repos.getMessage(input.id);
    if (!existing || existing.role !== "user") {
      throw new Error("User message not found");
    }
    return toMessageDto(getHubDatabase().repos.updateMessage(input.id, input.content, existing.status));
  });

  registerHandler(IpcChannel.messagesDeleteFrom, idInputSchema, ipcAckResultSchema, (input) => {
    getHubDatabase().repos.deleteMessagesFrom(input.id);
  });

  registerHandler(
    IpcChannel.settingsGetAppearance,
    emptyIpcPayloadSchema,
    appearanceSettingsSchema,
    () => appearanceSettingsSchema.parse(getHubDatabase().repos.getAppearance()),
  );

  registerHandler(
    IpcChannel.settingsSetAppearance,
    appearanceSettingsSchema,
    ipcAckResultSchema,
    (input) => {
      getHubDatabase().repos.setAppearance(input);
    },
  );

  registerHandler(
    IpcChannel.settingsGetSession,
    emptyIpcPayloadSchema,
    workspaceSessionSchema,
    () => {
      const parsed = workspaceSessionSchema.safeParse(getHubDatabase().repos.getWorkspaceSession());
      if (!parsed.success) {
        return { projectId: null, conversationId: null, model: "gpt-4o-mini" };
      }
      return parsed.data;
    },
  );

  registerHandler(
    IpcChannel.settingsSetSession,
    workspaceSessionSchema,
    ipcAckResultSchema,
    (input) => {
      getHubDatabase().repos.setWorkspaceSession(input);
    },
  );

  registerHandler(IpcChannel.providersList, emptyIpcPayloadSchema, providerListResultSchema, () =>
    getHubDatabase().repos.listProviders(),
  );

  registerHandler(IpcChannel.secretsList, emptyIpcPayloadSchema, providerKeyListResultSchema, () =>
    getHubDatabase().repos.listProviderKeys(),
  );

  registerHandler(IpcChannel.secretsSave, secretsSaveInputSchema, providerKeyDtoSchema, (input) =>
    getHubDatabase().repos.saveProviderKey(input),
  );

  registerHandler(IpcChannel.secretsRemove, idInputSchema, ipcAckResultSchema, (input) =>
    getHubDatabase().repos.removeProviderKey(input.id),
  );

  registerHandler(IpcChannel.chatSend, chatSendInputSchema, chatSendResultSchema, (input, event) =>
    sendChat(input, event.sender),
  );

  registerHandler(IpcChannel.chatAbort, chatAbortInputSchema, ipcAckResultSchema, (input) => {
    abortChat(input.runId);
  });
}

export function registerWindowIpc(
  targetWindow: (event: Electron.IpcMainInvokeEvent) => Electron.BrowserWindow | null,
): void {
  registerHandler(IpcChannel.windowMinimize, emptyIpcPayloadSchema, ipcAckResultSchema, (_input, event) => {
    targetWindow(event)?.minimize();
  });

  registerHandler(IpcChannel.windowMaximize, emptyIpcPayloadSchema, ipcAckResultSchema, (_input, event) => {
    const window = targetWindow(event);
    if (!window) {
      return;
    }
    if (window.isMaximized()) {
      window.unmaximize();
      return;
    }
    window.maximize();
  });

  registerHandler(IpcChannel.windowClose, emptyIpcPayloadSchema, ipcAckResultSchema, (_input, event) => {
    targetWindow(event)?.close();
  });

  registerHandler(
    IpcChannel.windowIsMaximized,
    emptyIpcPayloadSchema,
    windowIsMaximizedResultSchema,
    (_input, event) => targetWindow(event)?.isMaximized() ?? false,
  );
}
