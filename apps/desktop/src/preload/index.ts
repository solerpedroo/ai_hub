import { contextBridge, ipcRenderer, webUtils } from "electron";
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
  conversationToProjectResultSchema,
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
  messagePinInputSchema,
  messageUpdateInputSchema,
  packetPreviewInputSchema,
  packetPreviewResultSchema,
  packetsApplyInputSchema,
  packetsClearInputSchema,
  packetsCompileInputSchema,
  packetsExportInputSchema,
  packetsExportResultSchema,
  packetsImportInputSchema,
  packetsListInputSchema,
  projectFileListInputSchema,
  projectFileListResultSchema,
  filesAttachInputSchema,
  filesIngestPathsInputSchema,
  filesRemoveInputSchema,
  memoryListInputSchema,
  memoryListResultSchema,
  memoryCreateInputSchema,
  memoryUpdateInputSchema,
  memorySuggestInputSchema,
  memorySuggestResultSchema,
  memoryOptOutInputSchema,
  memoryOptOutStateSchema,
  memorySetOptOutInputSchema,
  projectMemoryDtoSchema,
  conversationWorkspaceDtoSchema,
  workspaceConversationInputSchema,
  workspaceAddTaskInputSchema,
  workspaceSetTaskDoneInputSchema,
  conversationTaskDtoSchema,
  contextPacketDtoSchema,
  contextPacketListResultSchema,
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
    duplicate: (input) =>
      invokeParsed(IpcChannel.conversationsDuplicate, input, idInputSchema, conversationDtoSchema),
    toProject: (input) =>
      invokeParsed(IpcChannel.conversationsToProject, input, idInputSchema, conversationToProjectResultSchema),
  },
  messages: {
    list: (input) =>
      invokeParsed(IpcChannel.messagesList, input, messageListInputSchema, messageListResultSchema),
    create: (input) =>
      invokeParsed(IpcChannel.messagesCreate, input, messageCreateInputSchema, messageDtoSchema),
    update: (input) =>
      invokeParsed(IpcChannel.messagesUpdate, input, messageUpdateInputSchema, messageDtoSchema),
    activate: (input) => invokeAckWith(IpcChannel.messagesActivate, input, idInputSchema),
    pin: (input) => invokeParsed(IpcChannel.messagesPin, input, messagePinInputSchema, messageDtoSchema),
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
  packets: {
    list: (input) =>
      invokeParsed(IpcChannel.packetsList, input, packetsListInputSchema, contextPacketListResultSchema),
    compile: (input) =>
      invokeParsed(IpcChannel.packetsCompile, input, packetsCompileInputSchema, contextPacketDtoSchema),
    export: (input) =>
      invokeParsed(IpcChannel.packetsExport, input, packetsExportInputSchema, packetsExportResultSchema),
    pickFile: () =>
      invokeParsed(IpcChannel.packetsPickFile, empty, emptyIpcPayloadSchema, importPickResultSchema),
    import: (input) =>
      invokeParsed(IpcChannel.packetsImport, input, packetsImportInputSchema, contextPacketDtoSchema),
    apply: (input) =>
      invokeParsed(IpcChannel.packetsApply, input, packetsApplyInputSchema, conversationDtoSchema),
    clear: (input) =>
      invokeParsed(IpcChannel.packetsClear, input, packetsClearInputSchema, conversationDtoSchema),
  },
  files: {
    list: (input) =>
      invokeParsed(
        IpcChannel.filesList,
        input,
        projectFileListInputSchema,
        projectFileListResultSchema,
      ),
    attach: (input) =>
      invokeParsed(IpcChannel.filesAttach, input, filesAttachInputSchema, projectFileListResultSchema),
    fromDrop: (input) => {
      const list = Array.isArray(input.files) ? input.files : [];
      const items = list.flatMap((item) => {
        if (typeof File !== "undefined" && item instanceof File) {
          return [{ path: webUtils.getPathForFile(item), name: item.name }];
        }
        return [];
      });
      return invokeParsed(
        IpcChannel.filesIngestPaths,
        { projectId: input.projectId, items },
        filesIngestPathsInputSchema,
        projectFileListResultSchema,
      );
    },
    remove: (input) => invokeAckWith(IpcChannel.filesRemove, input, filesRemoveInputSchema),
  },
  memory: {
    list: (input) =>
      invokeParsed(IpcChannel.memoryList, input, memoryListInputSchema, memoryListResultSchema),
    create: (input) =>
      invokeParsed(IpcChannel.memoryCreate, input, memoryCreateInputSchema, projectMemoryDtoSchema),
    update: (input) =>
      invokeParsed(IpcChannel.memoryUpdate, input, memoryUpdateInputSchema, projectMemoryDtoSchema),
    remove: (input) => invokeAckWith(IpcChannel.memoryRemove, input, idInputSchema),
    suggest: (input) =>
      invokeParsed(IpcChannel.memorySuggest, input, memorySuggestInputSchema, memorySuggestResultSchema),
    getOptOut: (input) =>
      invokeParsed(IpcChannel.memoryGetOptOut, input, memoryOptOutInputSchema, memoryOptOutStateSchema),
    setOptOut: (input) =>
      invokeParsed(IpcChannel.memorySetOptOut, input, memorySetOptOutInputSchema, memoryOptOutStateSchema),
  },
  workspace: {
    get: (input) =>
      invokeParsed(
        IpcChannel.workspaceGet,
        input,
        workspaceConversationInputSchema,
        conversationWorkspaceDtoSchema,
      ),
    refresh: (input) =>
      invokeParsed(
        IpcChannel.workspaceRefresh,
        input,
        workspaceConversationInputSchema,
        conversationWorkspaceDtoSchema,
      ),
    addTask: (input) =>
      invokeParsed(IpcChannel.workspaceAddTask, input, workspaceAddTaskInputSchema, conversationTaskDtoSchema),
    setTaskDone: (input) =>
      invokeParsed(
        IpcChannel.workspaceSetTaskDone,
        input,
        workspaceSetTaskDoneInputSchema,
        conversationTaskDtoSchema,
      ),
    removeTask: (input) => invokeAckWith(IpcChannel.workspaceRemoveTask, input, idInputSchema),
  },
};

contextBridge.exposeInMainWorld("hub", hub);
