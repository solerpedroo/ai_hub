import { contextBridge, ipcRenderer } from "electron";
import { ZodError, type ZodType } from "zod";
import {
  IpcChannel,
  type HubApi,
  appearanceSettingsSchema,
  branchLabelSetInputSchema,
  branchLabelsGetInputSchema,
  branchLabelsSchema,
  chatAbortInputSchema,
  chatEventSchema,
  chatSendInputSchema,
  chatSendResultSchema,
  conversationCreateInputSchema,
  conversationListInputSchema,
  conversationListResultSchema,
  conversationDtoSchema,
  conversationExportInputSchema,
  conversationExportResultSchema,
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

const empty = emptyIpcPayloadSchema.parse({});

function rethrowIpcError(error: unknown): never {
  if (error instanceof ZodError) {
    throw new Error("Invalid request");
  }
  throw error;
}

async function invokeParsed<TIn, TOut>(
  channel: string,
  payload: TIn,
  inputSchema: ZodType<TIn>,
  outputSchema: ZodType<TOut>,
): Promise<TOut> {
  try {
    const parsed = inputSchema.parse(payload);
    const result: unknown = await ipcRenderer.invoke(channel, parsed);
    return outputSchema.parse(result);
  } catch (error) {
    rethrowIpcError(error);
  }
}

async function invokeAck(channel: string): Promise<void> {
  try {
    const result: unknown = await ipcRenderer.invoke(channel, empty);
    ipcAckResultSchema.parse(result);
  } catch (error) {
    rethrowIpcError(error);
  }
}

async function invokeAckWith<TIn>(
  channel: string,
  payload: TIn,
  inputSchema: ZodType<TIn>,
): Promise<void> {
  try {
    const parsed = inputSchema.parse(payload);
    const result: unknown = await ipcRenderer.invoke(channel, parsed);
    ipcAckResultSchema.parse(result);
  } catch (error) {
    rethrowIpcError(error);
  }
}

const hub: HubApi = {
  platform:
    process.platform === "darwin" || process.platform === "linux" ? process.platform : "win32",
  window: {
    minimize: () => invokeAck(IpcChannel.windowMinimize),
    maximize: () => invokeAck(IpcChannel.windowMaximize),
    close: () => invokeAck(IpcChannel.windowClose),
    isMaximized: async () => {
      try {
        const result: unknown = await ipcRenderer.invoke(IpcChannel.windowIsMaximized, empty);
        return windowIsMaximizedResultSchema.parse(result);
      } catch (error) {
        rethrowIpcError(error);
      }
    },
  },
  projects: {
    list: () => invokeParsed(IpcChannel.projectsList, empty, emptyIpcPayloadSchema, projectListResultSchema),
    create: (input) =>
      invokeParsed(IpcChannel.projectsCreate, input, projectCreateInputSchema, projectDtoSchema),
    remove: (input) => invokeAckWith(IpcChannel.projectsRemove, input, idInputSchema),
  },
  conversations: {
    list: (input) =>
      invokeParsed(
        IpcChannel.conversationsList,
        input,
        conversationListInputSchema,
        conversationListResultSchema,
      ),
    create: (input) =>
      invokeParsed(IpcChannel.conversationsCreate, input, conversationCreateInputSchema, conversationDtoSchema),
    remove: (input) => invokeAckWith(IpcChannel.conversationsRemove, input, idInputSchema),
    export: (input) =>
      invokeParsed(
        IpcChannel.conversationsExport,
        input,
        conversationExportInputSchema,
        conversationExportResultSchema,
      ),
    getBranchLabels: (input) =>
      invokeParsed(
        IpcChannel.conversationsGetBranchLabels,
        input,
        branchLabelsGetInputSchema,
        branchLabelsSchema,
      ),
    setBranchLabel: (input) =>
      invokeAckWith(IpcChannel.conversationsSetBranchLabel, input, branchLabelSetInputSchema),
  },
  messages: {
    list: (input) =>
      invokeParsed(IpcChannel.messagesList, input, messageListInputSchema, messageListResultSchema),
    create: (input) =>
      invokeParsed(IpcChannel.messagesCreate, input, messageCreateInputSchema, messageDtoSchema),
    update: (input) =>
      invokeParsed(IpcChannel.messagesUpdate, input, messageUpdateInputSchema, messageDtoSchema),
    activate: (input) => invokeAckWith(IpcChannel.messagesActivate, input, idInputSchema),
  },
  settings: {
    getAppearance: () =>
      invokeParsed(
        IpcChannel.settingsGetAppearance,
        empty,
        emptyIpcPayloadSchema,
        appearanceSettingsSchema,
      ),
    setAppearance: (input) =>
      invokeAckWith(IpcChannel.settingsSetAppearance, input, appearanceSettingsSchema),
    getSession: () =>
      invokeParsed(
        IpcChannel.settingsGetSession,
        empty,
        emptyIpcPayloadSchema,
        workspaceSessionSchema,
      ),
    setSession: (input) => invokeAckWith(IpcChannel.settingsSetSession, input, workspaceSessionSchema),
  },
  providers: {
    list: () => invokeParsed(IpcChannel.providersList, empty, emptyIpcPayloadSchema, providerListResultSchema),
  },
  secrets: {
    list: () => invokeParsed(IpcChannel.secretsList, empty, emptyIpcPayloadSchema, providerKeyListResultSchema),
    save: (input) => invokeParsed(IpcChannel.secretsSave, input, secretsSaveInputSchema, providerKeyDtoSchema),
    remove: (input) => invokeAckWith(IpcChannel.secretsRemove, input, idInputSchema),
  },
  chat: {
    send: (input) => invokeParsed(IpcChannel.chatSend, input, chatSendInputSchema, chatSendResultSchema),
    abort: (input) => invokeAckWith(IpcChannel.chatAbort, input, chatAbortInputSchema),
    onEvent: (listener) => {
      const wrapped = (_event: unknown, payload: unknown): void => {
        try {
          listener(chatEventSchema.parse(payload));
        } catch (error) {
          rethrowIpcError(error);
        }
      };
      ipcRenderer.on(IpcChannel.chatEvent, wrapped);
      return () => {
        ipcRenderer.removeListener(IpcChannel.chatEvent, wrapped);
      };
    },
  },
};

contextBridge.exposeInMainWorld("hub", hub);
