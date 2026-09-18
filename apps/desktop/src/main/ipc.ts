import { ipcMain } from "electron";
import { ZodError, type ZodType } from "zod";
import {
  IpcChannel,
  appearanceSettingsSchema,
  branchLabelSetInputSchema,
  branchLabelsGetInputSchema,
  branchLabelsSchema,
  chatAbortInputSchema,
  chatSendInputSchema,
  chatSendResultSchema,
  conversationCreateInputSchema,
  conversationDtoSchema,
  conversationExportInputSchema,
  conversationExportResultSchema,
  conversationListInputSchema,
  conversationListResultSchema,
  conversationMoveInputSchema,
  conversationTagsSetInputSchema,
  costsAggregateInputSchema,
  costsAggregateResultSchema,
  debugSnapshotResultSchema,
  emptyIpcPayloadSchema,
  healthSummaryListSchema,
  appPrefsSchema,
  appPrefsPatchSchema,
  updateCheckResultSchema,
  idInputSchema,
  importCancelInputSchema,
  importPickResultSchema,
  importStartInputSchema,
  importStartResultSchema,
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
  SPEND_CAP_SCOPES,
  summarizeProviderHealth,
  windowIsMaximizedResultSchema,
  workspaceSessionSchema,
} from "@ai-hub/shared";
import { safeErrorMessage } from "@ai-hub/security";
import { abortChat, sendChat } from "./chat-session";
import { exportConversation } from "./conversation-export";
import { applyCrashReporterOptIn } from "./crash-reporter";
import { getLatestDebugSnapshot } from "./debug-snapshot";
import { cancelImportJob, pickImportFile, startImportJob } from "./import-job";
import { toMessageDto } from "./message-dto";
import {
  compileAndSavePacket,
  exportSavedPacket,
  importPacketFile,
  listProjectPackets,
  pickPacketFile,
} from "./packet-file";
import { previewPacket } from "./packet-preview";
import { getHubDatabase } from "./persistence";
import { testProviderKey } from "./provider-health";
import { localDayStartMs } from "./spend-guard";
import { checkForAppUpdates } from "./updater";

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
    projectDtoSchema.parse(
      getHubDatabase().repos.createProject(input.name, {
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.instructions !== undefined ? { instructions: input.instructions } : {}),
        ...(input.preferredModel !== undefined ? { preferredModel: input.preferredModel } : {}),
        ...(input.preferredProvider !== undefined ? { preferredProvider: input.preferredProvider } : {}),
      }),
    ),
  );

  registerHandler(IpcChannel.projectsUpdate, projectUpdateInputSchema, projectDtoSchema, (input) =>
    projectDtoSchema.parse(
      getHubDatabase().repos.updateProject(input.id, input.name, {
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.instructions !== undefined ? { instructions: input.instructions } : {}),
        ...(input.preferredModel !== undefined ? { preferredModel: input.preferredModel } : {}),
        ...(input.preferredProvider !== undefined ? { preferredProvider: input.preferredProvider } : {}),
      }),
    ),
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
        .repos.listConversations(input.projectId, input.inbox ?? "avulsas")
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

  registerHandler(
    IpcChannel.conversationsExport,
    conversationExportInputSchema,
    conversationExportResultSchema,
    (input, event) => exportConversation(input, event.sender),
  );

  registerHandler(
    IpcChannel.conversationsGetBranchLabels,
    branchLabelsGetInputSchema,
    branchLabelsSchema,
    (input) => {
      const parsed = branchLabelsSchema.safeParse(
        getHubDatabase().repos.getBranchLabels(input.conversationId),
      );
      return parsed.success ? parsed.data : {};
    },
  );

  registerHandler(
    IpcChannel.conversationsSetBranchLabel,
    branchLabelSetInputSchema,
    ipcAckResultSchema,
    (input) => {
      getHubDatabase().repos.setBranchLabel(input.conversationId, input.branchId, input.label);
    },
  );

  registerHandler(
    IpcChannel.conversationsSetTags,
    conversationTagsSetInputSchema,
    conversationDtoSchema,
    (input) =>
      conversationDtoSchema.parse(
        getHubDatabase().repos.setConversationTags(input.conversationId, input.names),
      ),
  );

  registerHandler(
    IpcChannel.conversationsMove,
    conversationMoveInputSchema,
    conversationDtoSchema,
    (input) => conversationDtoSchema.parse(getHubDatabase().repos.moveConversation(input.conversationId, input.projectId)),
  );

  registerHandler(IpcChannel.importPickFile, emptyIpcPayloadSchema, importPickResultSchema, (_input, event) =>
    pickImportFile(event.sender),
  );

  registerHandler(IpcChannel.importStart, importStartInputSchema, importStartResultSchema, (input, event) =>
    startImportJob(input, event.sender),
  );

  registerHandler(IpcChannel.importCancel, importCancelInputSchema, ipcAckResultSchema, (input) => {
    cancelImportJob(input.jobId);
  });

  registerHandler(IpcChannel.searchQuery, searchInputSchema, searchResultSchema, (input) =>
    getHubDatabase().repos.searchWorkspace(input.query),
  );

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

  registerHandler(IpcChannel.messagesActivate, idInputSchema, ipcAckResultSchema, (input) => {
    getHubDatabase().repos.activatePathThrough(input.id);
  });

  registerHandler(IpcChannel.messagesPin, messagePinInputSchema, messageDtoSchema, (input) =>
    toMessageDto(getHubDatabase().repos.setMessagePinned(input.id, input.pinned)),
  );

  registerHandler(IpcChannel.packetsList, packetsListInputSchema, contextPacketListResultSchema, (input) =>
    listProjectPackets(input.projectId),
  );

  registerHandler(IpcChannel.packetsCompile, packetsCompileInputSchema, contextPacketDtoSchema, (input) =>
    compileAndSavePacket(input),
  );

  registerHandler(
    IpcChannel.packetsExport,
    packetsExportInputSchema,
    packetsExportResultSchema,
    (input, event) => exportSavedPacket(input, event.sender),
  );

  registerHandler(IpcChannel.packetsPickFile, emptyIpcPayloadSchema, importPickResultSchema, (_input, event) =>
    pickPacketFile(event.sender),
  );

  registerHandler(IpcChannel.packetsImport, packetsImportInputSchema, contextPacketDtoSchema, (input) =>
    importPacketFile(input),
  );

  registerHandler(IpcChannel.packetsApply, packetsApplyInputSchema, conversationDtoSchema, (input) =>
    conversationDtoSchema.parse(
      getHubDatabase().repos.applyContextPacket(input.conversationId, input.packetId),
    ),
  );

  registerHandler(IpcChannel.packetsClear, packetsClearInputSchema, conversationDtoSchema, (input) =>
    conversationDtoSchema.parse(getHubDatabase().repos.clearContextPacket(input.conversationId)),
  );

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
      getHubDatabase().repos.setWorkspaceSession({
        projectId: input.projectId,
        conversationId: input.conversationId,
        model: input.model,
        temperature: input.temperature ?? 1,
        maxTokens: input.maxTokens ?? null,
        extraSystem: input.extraSystem ?? "",
        importedInbox: input.importedInbox === true,
      });
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

  registerHandler(IpcChannel.secretsTest, secretsTestInputSchema, secretsTestResultSchema, (input) =>
    testProviderKey(input.id),
  );

  registerHandler(IpcChannel.chatSend, chatSendInputSchema, chatSendResultSchema, (input, event) =>
    sendChat(input, event.sender),
  );

  registerHandler(IpcChannel.chatAbort, chatAbortInputSchema, ipcAckResultSchema, (input) => {
    abortChat(input.runId);
  });

  registerHandler(
    IpcChannel.chatPreviewPacket,
    packetPreviewInputSchema,
    packetPreviewResultSchema,
    (input) => previewPacket(input),
  );

  registerHandler(IpcChannel.spendCapsGet, emptyIpcPayloadSchema, spendCapListResultSchema, () => {
    const rows = getHubDatabase().repos.listSpendCaps();
    return SPEND_CAP_SCOPES.map((scope) => ({
      scope,
      limitUsd: rows.find((row) => row.scope === scope)?.limitUsd ?? null,
    }));
  });

  registerHandler(
    IpcChannel.spendCapsSet,
    spendCapSetInputSchema,
    spendCapListResultSchema,
    (input) => {
      const repos = getHubDatabase().repos;
      for (const cap of input.caps) {
        repos.upsertSpendCap(cap.scope, cap.limitUsd);
      }
      const rows = repos.listSpendCaps();
      return SPEND_CAP_SCOPES.map((scope) => ({
        scope,
        limitUsd: rows.find((row) => row.scope === scope)?.limitUsd ?? null,
      }));
    },
  );

  registerHandler(IpcChannel.healthSummary, emptyIpcPayloadSchema, healthSummaryListSchema, async () => {
    const repos = getHubDatabase().repos;
    const samples = summarizeProviderHealth(repos.listRecentHealthSamples());
    const bySlug = new Map(samples.map((item) => [item.providerSlug, item]));
    const keys = await repos.listProviderKeys();
    const slugs = [...new Set([...keys.map((key) => key.providerSlug), ...bySlug.keys()])].sort();
    return slugs.map((providerSlug) => {
      const existing = bySlug.get(providerSlug);
      if (existing) {
        return existing;
      }
      return {
        providerSlug,
        lastOk: null,
        lastLatencyMs: null,
        errorRate: 0,
        sampleCount: 0,
      };
    });
  });

  registerHandler(
    IpcChannel.costsAggregate,
    costsAggregateInputSchema,
    costsAggregateResultSchema,
    (input) => {
      const repos = getHubDatabase().repos;
      return {
        conversationUsd: input.conversationId
          ? repos.sumReceiptCostUsd({ conversationId: input.conversationId })
          : null,
        projectUsd: input.projectId ? repos.sumReceiptCostUsd({ projectId: input.projectId }) : null,
        dayUsd: repos.sumReceiptCostUsd({ sinceMs: localDayStartMs() }),
        globalUsd: repos.sumReceiptCostUsd({}),
      };
    },
  );

  registerHandler(IpcChannel.debugGetLatest, emptyIpcPayloadSchema, debugSnapshotResultSchema, () =>
    getLatestDebugSnapshot(),
  );

  registerHandler(IpcChannel.prefsGet, emptyIpcPayloadSchema, appPrefsSchema, () =>
    appPrefsSchema.parse(getHubDatabase().repos.getAppPrefs()),
  );

  registerHandler(IpcChannel.prefsSet, appPrefsPatchSchema, appPrefsSchema, (input) => {
    const next = appPrefsSchema.parse(getHubDatabase().repos.setAppPrefs(input));
    applyCrashReporterOptIn(next.crashReporterOptIn);
    return next;
  });

  registerHandler(IpcChannel.updatesCheck, emptyIpcPayloadSchema, updateCheckResultSchema, async () => {
    const result = await checkForAppUpdates();
    getHubDatabase().repos.setAppPrefs({
      lastUpdateCheckAt: new Date().toISOString(),
      lastUpdateStatus: result.status,
    });
    return result;
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
