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
  conversationMoveInputSchema,
  conversationDtoSchema,
  conversationExportInputSchema,
  conversationExportResultSchema,
  conversationTagsSetInputSchema,
  costsAggregateInputSchema,
  costsAggregateResultSchema,
  debugSnapshotResultSchema,
  emptyIpcPayloadSchema,
  healthSummaryListSchema,
  importCancelInputSchema,
  importEventSchema,
  importPickResultSchema,
  importStartInputSchema,
  importStartResultSchema,
  appPrefsSchema,
  appPrefsPatchSchema,
  updateCheckResultSchema,
  idInputSchema,
  ipcAckResultSchema,
  messageCreateInputSchema,
  messageDtoSchema,
  messageListInputSchema,
  messageListResultSchema,
  messageUpdateInputSchema,
  packetPreviewInputSchema,
  packetPreviewResultSchema,
  projectCreateInputSchema,
  projectDtoSchema,
  projectListResultSchema,
  projectUpdateInputSchema,
  providerKeyDtoSchema,
  providerKeyListResultSchema,
  providerListResultSchema,
  searchInputSchema,
  searchResultSchema,
  secretsSaveInputSchema,
  secretsTestInputSchema,
  secretsTestResultSchema,
  spendCapListResultSchema,
  spendCapSetInputSchema,
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
    update: (input) =>
      invokeParsed(IpcChannel.projectsUpdate, input, projectUpdateInputSchema, projectDtoSchema),
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
    setTags: (input) =>
      invokeParsed(
        IpcChannel.conversationsSetTags,
        input,
        conversationTagsSetInputSchema,
        conversationDtoSchema,
      ),
    move: (input) =>
      invokeParsed(IpcChannel.conversationsMove, input, conversationMoveInputSchema, conversationDtoSchema),
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
  prefs: {
    get: () => invokeParsed(IpcChannel.prefsGet, empty, emptyIpcPayloadSchema, appPrefsSchema),
    set: (input) => invokeParsed(IpcChannel.prefsSet, input, appPrefsPatchSchema, appPrefsSchema),
  },
  updates: {
    check: () => invokeParsed(IpcChannel.updatesCheck, empty, emptyIpcPayloadSchema, updateCheckResultSchema),
  },
  providers: {
    list: () => invokeParsed(IpcChannel.providersList, empty, emptyIpcPayloadSchema, providerListResultSchema),
  },
  secrets: {
    list: () => invokeParsed(IpcChannel.secretsList, empty, emptyIpcPayloadSchema, providerKeyListResultSchema),
    save: (input) => invokeParsed(IpcChannel.secretsSave, input, secretsSaveInputSchema, providerKeyDtoSchema),
    remove: (input) => invokeAckWith(IpcChannel.secretsRemove, input, idInputSchema),
    test: (input) =>
      invokeParsed(IpcChannel.secretsTest, input, secretsTestInputSchema, secretsTestResultSchema),
  },
  search: {
    query: (input) => invokeParsed(IpcChannel.searchQuery, input, searchInputSchema, searchResultSchema),
  },
  spendCaps: {
    get: () =>
      invokeParsed(IpcChannel.spendCapsGet, empty, emptyIpcPayloadSchema, spendCapListResultSchema),
    set: (input) =>
      invokeParsed(IpcChannel.spendCapsSet, input, spendCapSetInputSchema, spendCapListResultSchema),
  },
  health: {
    summary: () =>
      invokeParsed(IpcChannel.healthSummary, empty, emptyIpcPayloadSchema, healthSummaryListSchema),
  },
  costs: {
    aggregate: (input) =>
      invokeParsed(IpcChannel.costsAggregate, input, costsAggregateInputSchema, costsAggregateResultSchema),
  },
  debug: {
    getLatest: () =>
      invokeParsed(IpcChannel.debugGetLatest, empty, emptyIpcPayloadSchema, debugSnapshotResultSchema),
  },
  chat: {
    send: (input) => invokeParsed(IpcChannel.chatSend, input, chatSendInputSchema, chatSendResultSchema),
    abort: (input) => invokeAckWith(IpcChannel.chatAbort, input, chatAbortInputSchema),
    previewPacket: (input) =>
      invokeParsed(
        IpcChannel.chatPreviewPacket,
        input,
        packetPreviewInputSchema,
        packetPreviewResultSchema,
      ),
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
  import: {
    pickFile: () =>
      invokeParsed(IpcChannel.importPickFile, empty, emptyIpcPayloadSchema, importPickResultSchema),
    start: (input) =>
      invokeParsed(IpcChannel.importStart, input, importStartInputSchema, importStartResultSchema),
    cancel: (input) => invokeAckWith(IpcChannel.importCancel, input, importCancelInputSchema),
    onEvent: (listener) => {
      const wrapped = (_event: unknown, payload: unknown): void => {
        try {
          listener(importEventSchema.parse(payload));
        } catch (error) {
          rethrowIpcError(error);
        }
      };
      ipcRenderer.on(IpcChannel.importEvent, wrapped);
      return () => {
        ipcRenderer.removeListener(IpcChannel.importEvent, wrapped);
      };
    },
  },
};

contextBridge.exposeInMainWorld("hub", hub);
