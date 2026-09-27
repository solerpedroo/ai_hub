import { clipboard, ipcMain } from "electron";
import { auditLogDtoSchema, organizationCreateInputSchema, organizationDtoSchema, organizationIdInputSchema, projectOrganizationInputSchema } from "@ai-hub/shared";
import { ZodError, z, type ZodType } from "zod";
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
  conversationToProjectResultSchema,
  conversationTagsSetInputSchema,
  conversationRunSettingsSchema,
  costsAggregateInputSchema,
  costsAggregateResultSchema,
  monthlyCostsInputSchema,
  monthlyCostsResultSchema,
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
  workspaceTasksFromMessageInputSchema,
  conversationTaskDtoSchema,
  projectNoteDtoSchema,
  notesListInputSchema,
  notesCreateFromMessageInputSchema,
  notesUpdateInputSchema,
  parseChecklistItems,
  promptDtoSchema,
  promptListResultSchema,
  promptCreateInputSchema,
  promptUpdateInputSchema,
  promptResolveInputSchema,
  promptResolveResultSchema,
  playgroundRunInputSchema,
  playgroundRunResultSchema,
  councilRunInputSchema,
  councilRunResultSchema,
  artifactDtoSchema,
  artifactListResultSchema,
  artifactsListInputSchema,
  artifactSaveVersionInputSchema,
  artifactPinInputSchema,
  artifactExportInputSchema,
  artifactExportResultSchema,
  skillDtoSchema,
  skillListResultSchema,
  skillCreateInputSchema,
  skillUpdateInputSchema,
  skillResolveInputSchema,
  skillResolveResultSchema,
  contextPacketDtoSchema,
  contextPacketListResultSchema,
  projectCreateInputSchema,
  projectDtoSchema,
  projectListResultSchema,
  projectUpdateInputSchema,
  providerKeyDtoSchema,
  providerKeyListResultSchema,
  localProviderStatusSchema,
  marketplacePackDtoSchema,
  marketplacePackIdInputSchema,
  marketplacePackListSchema,
  syncConfigDtoSchema, syncConfigureInputSchema, syncPickRelayResultSchema, syncRunResultSchema,
  providerListResultSchema,
  searchInputSchema,
  searchResultSchema,
  secretsSaveInputSchema,
  secretsTestInputSchema,
  secretsTestResultSchema,
  spendCapListResultSchema,
  spendCapSetInputSchema,
  scopedSpendCapListResultSchema,
  scopedSpendCapSetInputSchema,
  SPEND_CAP_SCOPES,
  summarizeProviderHealth,
  windowIsMaximizedResultSchema,
  clipboardTextSchema,
  workspaceSessionSchema,
  toolProjectGetInputSchema,
  toolProjectStateSchema,
  toolProjectRootPickResultSchema,
  toolReadRequestInputSchema,
  toolReadRequestResultSchema,
  toolActivityResultSchema,
  developerProjectInputSchema, developerDiffInputSchema, developerTreeResultSchema, developerStatusResultSchema, developerDiffResultSchema, developerReviewInputSchema, developerReviewResultSchema, developerTerminalInputSchema, developerTerminalResultSchema,
  agentPrepareInputSchema,
  agentIdInputSchema,
  agentListInputSchema,
  agentListResultSchema,
  agentRunDetailSchema,
  orchestrationPrepareInputSchema,
  researchPrepareInputSchema,
  orchestrationRunDetailSchema,
  orchestrationListResultSchema,
} from "@ai-hub/shared";
import { redactSecrets, safeErrorMessage } from "@ai-hub/security";
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
import { attachFromDialog, ingestDroppedPaths, listProjectFileDtos, removeProjectFile } from "./files";
import { suggestMemories } from "@ai-hub/memory";
import { previewPacket } from "./packet-preview";
import { getConversationWorkspaceDto, refreshConversationWorkspace } from "./workspace";
import { getHubDatabase } from "./persistence";
import { listPromptDtos, resolvePromptDto, runPlayground } from "./playground";
import { runCouncil } from "./council";
import { listSkillDtos, resolveSkillDto } from "./skills";
import { exportArtifact, toArtifactDto } from "./artifacts";
import { testProviderKey } from "./provider-health";
import { localDayStartMs } from "./spend-guard";
import { checkForAppUpdates } from "./updater";
import { getLatestToolActivity, getToolProjectState, pickProjectToolRoot, requestToolRead } from "./tools";
import { cancelAgentRun, getAgentRun, listAgentRuns, pauseAgentRun, prepareAgentRun, resumeAgentRun, startAgentRun } from "./agent-runner";
import { cancelOrchestration, getOrchestration, listOrchestrations, pauseOrchestration, prepareOrchestration, resumeOrchestration, startOrchestration } from "./orchestration-runner";
import { prepareResearch } from "./research-runner";
import { developerDiff, developerReview, developerStatus, developerTerminal, developerTree } from "./developer-tools";
import { getLocalProviderStatus, localProviderKey } from "./local-provider";
import { installMarketplacePack, listMarketplacePacks, uninstallMarketplacePack } from "./marketplace-packs";
import { configureSync, getSyncConfig, pickSyncRelay, runSync } from "./sync-service";

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

  registerHandler(IpcChannel.toolsGetProject, toolProjectGetInputSchema, toolProjectStateSchema, (input) =>
    getToolProjectState(input.projectId),
  );
  registerHandler(IpcChannel.toolsPickProjectRoot, toolProjectGetInputSchema, toolProjectRootPickResultSchema, (input, event) =>
    pickProjectToolRoot(input.projectId, event.sender),
  );
  registerHandler(IpcChannel.toolsRequestRead, toolReadRequestInputSchema, toolReadRequestResultSchema, (input, event) =>
    requestToolRead(input, event.sender),
  );
  registerHandler(IpcChannel.toolsGetLatestActivity, emptyIpcPayloadSchema, toolActivityResultSchema, () =>
    getLatestToolActivity(),
  );
  registerHandler(IpcChannel.developerTree, developerProjectInputSchema, developerTreeResultSchema, (input, event) => developerTree(input, event.sender));
  registerHandler(IpcChannel.developerStatus, developerProjectInputSchema, developerStatusResultSchema, (input, event) => developerStatus(input, event.sender));
  registerHandler(IpcChannel.developerDiff, developerDiffInputSchema, developerDiffResultSchema, (input, event) => developerDiff(input, event.sender));
  registerHandler(IpcChannel.developerReview, developerReviewInputSchema, developerReviewResultSchema, (input, event) => developerReview(input, event.sender));
  registerHandler(IpcChannel.developerTerminal, developerTerminalInputSchema, developerTerminalResultSchema, (input, event) => developerTerminal(input, event.sender));
  registerHandler(IpcChannel.agentsPrepare, agentPrepareInputSchema, agentRunDetailSchema, (input, event) =>
    prepareAgentRun({
      ...input,
      maxSteps: input.maxSteps ?? 6,
      budgetUsd: input.budgetUsd ?? "1.000000",
      timeoutSeconds: input.timeoutSeconds ?? 300,
    }, event.sender),
  );
  registerHandler(IpcChannel.agentsGet, agentIdInputSchema, agentRunDetailSchema, (input) => getAgentRun(input));
  registerHandler(IpcChannel.agentsList, agentListInputSchema, agentListResultSchema, (input) => listAgentRuns(input));
  registerHandler(IpcChannel.agentsStart, agentIdInputSchema, agentRunDetailSchema, (input, event) => startAgentRun(input, event.sender));
  registerHandler(IpcChannel.agentsPause, agentIdInputSchema, agentRunDetailSchema, (input) => pauseAgentRun(input));
  registerHandler(IpcChannel.agentsResume, agentIdInputSchema, agentRunDetailSchema, (input, event) => resumeAgentRun(input, event.sender));
  registerHandler(IpcChannel.agentsCancel, agentIdInputSchema, agentRunDetailSchema, (input) => cancelAgentRun(input));
  registerHandler(IpcChannel.orchestrationsPrepare, orchestrationPrepareInputSchema, orchestrationRunDetailSchema, (input, event) => prepareOrchestration({ ...input, maxSteps: input.maxSteps ?? 6, budgetUsd: input.budgetUsd ?? "1.000000", timeoutSeconds: input.timeoutSeconds ?? 300, parallelism: input.parallelism ?? 2, budgetMode: input.budgetMode ?? "shared" }, event.sender));
  registerHandler(IpcChannel.researchPrepare, researchPrepareInputSchema, orchestrationRunDetailSchema, (input, event) => prepareResearch({ ...input, budgetUsd: input.budgetUsd ?? "1.000000", timeoutSeconds: input.timeoutSeconds ?? 300 }, event.sender));
  registerHandler(IpcChannel.orchestrationsGet, agentIdInputSchema, orchestrationRunDetailSchema, (input) => getOrchestration(input));
  registerHandler(IpcChannel.orchestrationsList, agentListInputSchema, orchestrationListResultSchema, (input) => listOrchestrations(input.conversationId));
  registerHandler(IpcChannel.orchestrationsStart, agentIdInputSchema, orchestrationRunDetailSchema, (input, event) => startOrchestration(input, event.sender));
  registerHandler(IpcChannel.orchestrationsPause, agentIdInputSchema, orchestrationRunDetailSchema, (input) => pauseOrchestration(input));
  registerHandler(IpcChannel.orchestrationsResume, agentIdInputSchema, orchestrationRunDetailSchema, (input, event) => resumeOrchestration(input, event.sender));
  registerHandler(IpcChannel.orchestrationsCancel, agentIdInputSchema, orchestrationRunDetailSchema, (input) => cancelOrchestration(input));

  registerHandler(
    IpcChannel.conversationsList,
    conversationListInputSchema,
    conversationListResultSchema,
    (input) =>
      getHubDatabase()
        .repos.listConversations(input.projectId, input.inbox ?? "avulsas")
        .map((row) => conversationDtoSchema.parse(row)),
  );
  registerHandler(IpcChannel.councilRun, councilRunInputSchema, councilRunResultSchema, (input, event) =>
    runCouncil(input, event.sender),
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
  registerHandler(IpcChannel.conversationsSetRunSettings, conversationRunSettingsSchema, conversationDtoSchema, (input) => conversationDtoSchema.parse(getHubDatabase().repos.updateConversationRunSettings(input.conversationId, input.runMode, input.effortLevel)));

  registerHandler(IpcChannel.conversationsDuplicate, idInputSchema, conversationDtoSchema, (input) =>
    conversationDtoSchema.parse(getHubDatabase().repos.duplicateConversation(input.id)),
  );

  registerHandler(
    IpcChannel.conversationsToProject,
    idInputSchema,
    conversationToProjectResultSchema,
    (input) => {
      const result = getHubDatabase().repos.promoteConversationToProject(input.id);
      return {
        project: projectDtoSchema.parse(result.project),
        conversation: conversationDtoSchema.parse(result.conversation),
      };
    },
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
    searchResultSchema.parse(getHubDatabase().repos.searchWorkspace(input.query)),
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

  registerHandler(IpcChannel.localProviderStatus, emptyIpcPayloadSchema, localProviderStatusSchema, () =>
    getLocalProviderStatus(true),
  );

  registerHandler(IpcChannel.marketplaceList, emptyIpcPayloadSchema, marketplacePackListSchema, () => listMarketplacePacks());
  registerHandler(IpcChannel.marketplaceInstall, marketplacePackIdInputSchema, marketplacePackDtoSchema, (input) => installMarketplacePack(input.packId));
  registerHandler(IpcChannel.marketplaceUninstall, marketplacePackIdInputSchema, ipcAckResultSchema, (input) => {
    uninstallMarketplacePack(input.packId);
  });
  registerHandler(IpcChannel.syncGetConfig, emptyIpcPayloadSchema, syncConfigDtoSchema, () => getSyncConfig());
  registerHandler(IpcChannel.syncConfigure, syncConfigureInputSchema, syncConfigDtoSchema, (input) => configureSync(input));
  registerHandler(IpcChannel.syncPickRelay, emptyIpcPayloadSchema, syncPickRelayResultSchema, (_input, event) => pickSyncRelay(event.sender));
  registerHandler(IpcChannel.syncRun, emptyIpcPayloadSchema, syncRunResultSchema, () => runSync());
  registerHandler(IpcChannel.organizationsList, emptyIpcPayloadSchema, z.array(organizationDtoSchema), () => getHubDatabase().repos.listOrganizations());
  registerHandler(IpcChannel.organizationsCreate, organizationCreateInputSchema, organizationDtoSchema, (input) => getHubDatabase().repos.createOrganization(input.name));
  registerHandler(IpcChannel.organizationsAuditList, organizationIdInputSchema, z.array(auditLogDtoSchema), (input) => getHubDatabase().repos.listAuditLogs(input.organizationId));
  registerHandler(IpcChannel.organizationsAssignProject, projectOrganizationInputSchema, ipcAckResultSchema, (input) => { getHubDatabase().repos.assignProjectOrganization(input.projectId, input.organizationId); });

  registerHandler(IpcChannel.secretsList, emptyIpcPayloadSchema, providerKeyListResultSchema, async () => {
    const keys = await getHubDatabase().repos.listProviderKeys();
    const local = await getLocalProviderStatus();
    return local.available && local.models.length > 0 ? [...keys, localProviderKey()] : keys;
  });

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

  registerHandler(
    IpcChannel.filesList,
    projectFileListInputSchema,
    projectFileListResultSchema,
    (input) => listProjectFileDtos(input.projectId),
  );

  registerHandler(
    IpcChannel.filesAttach,
    filesAttachInputSchema,
    projectFileListResultSchema,
    (input, event) => attachFromDialog(input, event.sender),
  );

  registerHandler(
    IpcChannel.filesIngestPaths,
    filesIngestPathsInputSchema,
    projectFileListResultSchema,
    (input) => ingestDroppedPaths(input),
  );

  registerHandler(IpcChannel.filesRemove, filesRemoveInputSchema, ipcAckResultSchema, (input) => {
    removeProjectFile(input.id, input.projectId);
  });

  registerHandler(IpcChannel.memoryList, memoryListInputSchema, memoryListResultSchema, (input) =>
    getHubDatabase().repos.listProjectMemories(input.projectId).map((row) => projectMemoryDtoSchema.parse(row)),
  );

  registerHandler(IpcChannel.memoryCreate, memoryCreateInputSchema, projectMemoryDtoSchema, (input) =>
    projectMemoryDtoSchema.parse(
      getHubDatabase().repos.createProjectMemory({
        projectId: input.projectId,
        title: input.title,
        body: input.body,
        source: input.source ?? "manual",
      }),
    ),
  );

  registerHandler(IpcChannel.memoryUpdate, memoryUpdateInputSchema, projectMemoryDtoSchema, (input) =>
    projectMemoryDtoSchema.parse(
      getHubDatabase().repos.updateProjectMemory(input.id, {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
      }),
    ),
  );

  registerHandler(IpcChannel.memoryRemove, idInputSchema, ipcAckResultSchema, (input) => {
    getHubDatabase().repos.removeProjectMemory(input.id);
  });

  registerHandler(IpcChannel.memorySuggest, memorySuggestInputSchema, memorySuggestResultSchema, (input) => {
    const repos = getHubDatabase().repos;
    const optedOut = repos.getMemoryOptOut(input.projectId);
    return {
      optedOut,
      suggestions: optedOut ? [] : suggestMemories(input.text),
    };
  });

  registerHandler(IpcChannel.memoryGetOptOut, memoryOptOutInputSchema, memoryOptOutStateSchema, (input) => ({
    optedOut: getHubDatabase().repos.getMemoryOptOut(input.projectId),
  }));

  registerHandler(IpcChannel.memorySetOptOut, memorySetOptOutInputSchema, memoryOptOutStateSchema, (input) => {
    getHubDatabase().repos.setMemoryOptOut(input.projectId, input.optedOut);
    return { optedOut: input.optedOut };
  });

  registerHandler(
    IpcChannel.workspaceGet,
    workspaceConversationInputSchema,
    conversationWorkspaceDtoSchema,
    (input) => getConversationWorkspaceDto(getHubDatabase().repos, input.conversationId),
  );

  registerHandler(
    IpcChannel.workspaceRefresh,
    workspaceConversationInputSchema,
    conversationWorkspaceDtoSchema,
    (input) => refreshConversationWorkspace(getHubDatabase().repos, input.conversationId),
  );

  registerHandler(IpcChannel.workspaceAddTask, workspaceAddTaskInputSchema, conversationTaskDtoSchema, (input) =>
    conversationTaskDtoSchema.parse(getHubDatabase().repos.createConversationTask(input.conversationId, input.title)),
  );

  registerHandler(
    IpcChannel.workspaceSetTaskDone,
    workspaceSetTaskDoneInputSchema,
    conversationTaskDtoSchema,
    (input) => conversationTaskDtoSchema.parse(getHubDatabase().repos.setConversationTaskDone(input.id, input.done)),
  );

  registerHandler(IpcChannel.workspaceRemoveTask, idInputSchema, ipcAckResultSchema, (input) => {
    getHubDatabase().repos.removeConversationTask(input.id);
  });

  registerHandler(IpcChannel.workspaceTasksFromMessage, workspaceTasksFromMessageInputSchema, z.array(conversationTaskDtoSchema).max(40), (input) => {
    const repos = getHubDatabase().repos;
    const message = repos.getMessage(input.messageId);
    if (!message || message.conversationId !== input.conversationId) throw new Error("Message not found");
    const titles = parseChecklistItems(message.content);
    if (titles.length === 0) {
      const fallback = message.content.replace(/\s+/g, " ").trim().slice(0, 240);
      if (fallback.length < 2) throw new Error("tasks:empty_checklist");
      return [conversationTaskDtoSchema.parse(repos.createConversationTask(input.conversationId, fallback, input.messageId))];
    }
    return repos.createConversationTasksFromTitles(input.conversationId, titles, input.messageId).map((task) => conversationTaskDtoSchema.parse(task));
  });

  registerHandler(IpcChannel.notesList, notesListInputSchema, z.array(projectNoteDtoSchema).max(200), (input) =>
    getHubDatabase().repos.listProjectNotes(input.projectId).map((note) => projectNoteDtoSchema.parse(note)),
  );

  registerHandler(IpcChannel.notesCreateFromMessage, notesCreateFromMessageInputSchema, projectNoteDtoSchema, (input) => {
    const repos = getHubDatabase().repos;
    const message = repos.getMessage(input.messageId);
    if (!message) throw new Error("Message not found");
    const conversation = repos.getConversation(message.conversationId);
    if (!conversation || conversation.projectId !== input.projectId) throw new Error("Message project mismatch");
    const title =
      input.title?.trim() ||
      message.content.replace(/\s+/g, " ").trim().slice(0, 80) ||
      "Note";
    return projectNoteDtoSchema.parse(
      repos.createProjectNote({
        projectId: input.projectId,
        title,
        body: message.content.slice(0, 32_000),
        sourceMessageId: input.messageId,
        ...(input.tags ? { tags: input.tags } : {}),
      }),
    );
  });

  registerHandler(IpcChannel.notesUpdate, notesUpdateInputSchema, projectNoteDtoSchema, (input) =>
    projectNoteDtoSchema.parse(
      getHubDatabase().repos.updateProjectNote(input.id, {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
      }),
    ),
  );

  registerHandler(IpcChannel.notesRemove, idInputSchema, ipcAckResultSchema, (input) => {
    getHubDatabase().repos.removeProjectNote(input.id);
  });

  registerHandler(IpcChannel.promptsList, emptyIpcPayloadSchema, promptListResultSchema, () =>
    listPromptDtos().map((row) => promptDtoSchema.parse(row)),
  );

  registerHandler(IpcChannel.promptsCreate, promptCreateInputSchema, promptDtoSchema, (input) =>
    promptDtoSchema.parse(
      getHubDatabase().repos.createPrompt({
        folder: input.folder,
        title: input.title,
        body: input.body,
      }),
    ),
  );

  registerHandler(IpcChannel.promptsUpdate, promptUpdateInputSchema, promptDtoSchema, (input) =>
    promptDtoSchema.parse(
      getHubDatabase().repos.updatePrompt(input.id, {
        ...(input.folder !== undefined ? { folder: input.folder } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
      }),
    ),
  );

  registerHandler(IpcChannel.promptsRemove, idInputSchema, ipcAckResultSchema, (input) => {
    getHubDatabase().repos.removePrompt(input.id);
  });

  registerHandler(IpcChannel.promptsResolve, promptResolveInputSchema, promptResolveResultSchema, (input) =>
    promptResolveResultSchema.parse(resolvePromptDto(input.promptId, input.projectId)),
  );

  registerHandler(
    IpcChannel.playgroundRun,
    playgroundRunInputSchema,
    playgroundRunResultSchema,
    (input, event) => runPlayground(input, event.sender),
  );

  registerHandler(
    IpcChannel.artifactsList,
    artifactsListInputSchema,
    artifactListResultSchema,
    (input) =>
      getHubDatabase()
        .repos.listArtifacts(input.conversationId)
        .slice(0, 100)
        .map((row) => artifactDtoSchema.parse(toArtifactDto(row))),
  );

  registerHandler(IpcChannel.artifactsGet, idInputSchema, artifactDtoSchema, (input) => {
    const row = getHubDatabase().repos.getArtifact(input.id);
    if (!row) {
      throw new Error("Artifact not found");
    }
    return artifactDtoSchema.parse(toArtifactDto(row));
  });

  registerHandler(IpcChannel.artifactsSaveVersion, artifactSaveVersionInputSchema, artifactDtoSchema, (input) => {
    const current = getHubDatabase().repos.getArtifact(input.id);
    if (!current) {
      throw new Error("Artifact not found");
    }
    return artifactDtoSchema.parse(
      toArtifactDto(
        getHubDatabase().repos.createArtifact({
          conversationId: current.conversationId,
          familyId: current.familyId,
          sourceMessageId: current.sourceMessageId,
          kind: current.kind,
          title: redactSecrets(input.title ?? current.title),
          body: redactSecrets(input.body),
          language: current.language,
        }),
      ),
    );
  });

  registerHandler(IpcChannel.artifactsSetPinned, artifactPinInputSchema, artifactDtoSchema, (input) => {
    const current = getHubDatabase().repos.getArtifact(input.id);
    if (!current) {
      throw new Error("Artifact not found");
    }
    getHubDatabase().repos.setArtifactFamilyPinned(current.familyId, input.pinned);
    const updated = getHubDatabase().repos.getArtifact(input.id);
    if (!updated) {
      throw new Error("Artifact not found");
    }
    return artifactDtoSchema.parse(toArtifactDto(updated));
  });

  registerHandler(
    IpcChannel.artifactsExport,
    artifactExportInputSchema,
    artifactExportResultSchema,
    (input, event) => exportArtifact(input, event.sender),
  );

  registerHandler(IpcChannel.skillsList, emptyIpcPayloadSchema, skillListResultSchema, () =>
    listSkillDtos().map((row) => skillDtoSchema.parse(row)),
  );

  registerHandler(IpcChannel.skillsCreate, skillCreateInputSchema, skillDtoSchema, (input) =>
    skillDtoSchema.parse({
      ...getHubDatabase().repos.createSkill({
        folder: input.folder,
        title: input.title,
        description: input.description,
        prompt: input.prompt,
        preferredModel: input.preferredModel,
        defaultMentions: input.defaultMentions,
        steps: input.steps,
        ...(input.allowedTools !== undefined ? { allowedTools: input.allowedTools } : {}),
      }),
    }),
  );

  registerHandler(IpcChannel.skillsUpdate, skillUpdateInputSchema, skillDtoSchema, (input) =>
    skillDtoSchema.parse({
      ...getHubDatabase().repos.updateSkill(input.id, {
        ...(input.folder !== undefined ? { folder: input.folder } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.prompt !== undefined ? { prompt: input.prompt } : {}),
        ...(input.preferredModel !== undefined ? { preferredModel: input.preferredModel } : {}),
        ...(input.defaultMentions !== undefined ? { defaultMentions: input.defaultMentions } : {}),
        ...(input.steps !== undefined ? { steps: input.steps } : {}),
        ...(input.allowedTools !== undefined ? { allowedTools: input.allowedTools } : {}),
      }),
    }),
  );

  registerHandler(IpcChannel.skillsRemove, idInputSchema, ipcAckResultSchema, (input) => {
    getHubDatabase().repos.removeSkill(input.id);
  });

  registerHandler(IpcChannel.skillsResolve, skillResolveInputSchema, skillResolveResultSchema, (input) =>
    skillResolveResultSchema.parse(
      resolveSkillDto(input.skillId, input.query, input.projectId, input.privacyMode ?? "standard"),
    ),
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

  registerHandler(IpcChannel.scopedSpendCapsGet, emptyIpcPayloadSchema, scopedSpendCapListResultSchema, () =>
    getHubDatabase().repos.listScopedSpendCaps().map(({ dimension, subjectId, limitUsd }) => ({ dimension, subjectId, limitUsd })),
  );

  registerHandler(
    IpcChannel.scopedSpendCapsSet,
    scopedSpendCapSetInputSchema,
    scopedSpendCapListResultSchema,
    (input) => {
      const repos = getHubDatabase().repos;
      for (const cap of input.caps) repos.upsertScopedSpendCap(cap.dimension, cap.subjectId, cap.limitUsd);
      return repos.listScopedSpendCaps().map(({ dimension, subjectId, limitUsd }) => ({ dimension, subjectId, limitUsd }));
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

  registerHandler(IpcChannel.costsMonthly, monthlyCostsInputSchema, monthlyCostsResultSchema, (input) => {
    const [year, month] = input.month.split("-").map(Number);
    const from = new Date(year ?? 1970, (month ?? 1) - 1, 1).getTime();
    const to = new Date(year ?? 1970, month ?? 1, 1).getTime();
    return { month: input.month, ...getHubDatabase().repos.summarizeReceipts(from, to) };
  });

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
  isQuickAiSender: (event: Electron.IpcMainInvokeEvent) => boolean = () => false,
): void {
  registerHandler(IpcChannel.quickAiReadClipboard, emptyIpcPayloadSchema, clipboardTextSchema, (_input, event) => {
    if (!isQuickAiSender(event)) throw new Error("quickAi:forbidden");
    return redactSecrets(clipboard.readText()).slice(0, 100_000);
  });
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
