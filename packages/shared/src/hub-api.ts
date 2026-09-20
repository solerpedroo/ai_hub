import type { AppLocale, ThemeMode } from "./appearance";
import type { ChatAbortInput, ChatSendInput } from "./gateway";
import type {
  AppearanceSettings,
  BranchLabelSetInput,
  BranchLabels,
  BranchLabelsGetInput,
  ChatEvent,
  ChatSendResult,
  ConversationCreateInput,
  ConversationDto,
  ConversationExportInput,
  ConversationTagsSetInput,
  ConversationExportResult,
  ConversationListInput,
  ConversationMoveInput,
  IdInput,
  MessageCreateInput,
  MessageDto,
  MessageListInput,
  MessageUpdateInput,
  PacketPreviewInput,
  PacketPreviewResult,
  ProjectCreateInput,
  ProjectDto,
  ProjectUpdateInput,
  ProviderDto,
  SearchHit,
  SearchInput,
  SpendCapDto,
  SpendCapSetInput,
  ScopedSpendCapDto,
  ScopedSpendCapSetInput,
  HealthSummaryDto,
  CostsAggregateInput,
  CostsAggregateResult,
  MonthlyCostsInput,
  MonthlyCostsResult,
  DebugSnapshot,
  AppPrefs,
  AppPrefsPatch,
  UpdateCheckResult,
  ImportCancelInput,
  ImportEvent,
  ImportPickResult,
  ImportStartInput,
  ImportStartResult,
  ContextPacketDto,
  PacketsApplyInput,
  PacketsClearInput,
  PacketsCompileInput,
  PacketsExportInput,
  PacketsExportResult,
  PacketsImportInput,
  PacketsListInput,
  MessagePinInput,
  ProjectFileDto,
  ProjectFileListInput,
  FilesAttachInput,
  FilesRemoveInput,
  ProjectMemoryDto,
  MemoryListInput,
  MemoryCreateInput,
  MemoryUpdateInput,
  MemorySuggestInput,
  MemorySuggestResult,
  MemoryOptOutInput,
  MemorySetOptOutInput,
  MemoryOptOutState,
  ConversationWorkspaceDto,
  WorkspaceConversationInput,
  WorkspaceAddTaskInput,
  WorkspaceSetTaskDoneInput,
  ConversationTaskDto,
  ConversationToProjectResult,
  PromptDto,
  PromptCreateInput,
  PromptUpdateInput,
  PromptResolveInput,
  PromptResolveResult,
  PlaygroundRunInput,
  PlaygroundRunResult,
  CouncilRunInput,
  CouncilRunResult,
  ArtifactDto,
  ArtifactsListInput,
  ArtifactSaveVersionInput,
  ArtifactPinInput,
  ArtifactExportInput,
  ArtifactExportResult,
  SkillDto,
  SkillCreateInput,
  SkillUpdateInput,
  SkillResolveInput,
  SkillResolveResult,
  ProviderKeyDto,
  SecretsSaveInput,
  SecretsTestInput,
  SecretsTestResult,
  WorkspaceSession,
} from "./ipc-schemas";

export interface HubQuickAiApi {
  readClipboard: () => Promise<string>;
  onPrefill: (listener: (text: string) => void) => () => void;
}

export interface HubWindowApi {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
}

export interface HubProjectsApi {
  list: () => Promise<ProjectDto[]>;
  create: (input: ProjectCreateInput) => Promise<ProjectDto>;
  update: (input: ProjectUpdateInput) => Promise<ProjectDto>;
  remove: (input: IdInput) => Promise<void>;
}

export interface HubConversationsApi {
  list: (input: ConversationListInput) => Promise<ConversationDto[]>;
  create: (input: ConversationCreateInput) => Promise<ConversationDto>;
  remove: (input: IdInput) => Promise<void>;
  export: (input: ConversationExportInput) => Promise<ConversationExportResult>;
  getBranchLabels: (input: BranchLabelsGetInput) => Promise<BranchLabels>;
  setBranchLabel: (input: BranchLabelSetInput) => Promise<void>;
  setTags: (input: ConversationTagsSetInput) => Promise<ConversationDto>;
  move: (input: ConversationMoveInput) => Promise<ConversationDto>;
  duplicate: (input: IdInput) => Promise<ConversationDto>;
  toProject: (input: IdInput) => Promise<ConversationToProjectResult>;
}

export interface HubMessagesApi {
  list: (input: MessageListInput) => Promise<MessageDto[]>;
  create: (input: MessageCreateInput) => Promise<MessageDto>;
  update: (input: MessageUpdateInput) => Promise<MessageDto>;
  activate: (input: IdInput) => Promise<void>;
  pin: (input: MessagePinInput) => Promise<MessageDto>;
}

export interface HubSettingsApi {
  getAppearance: () => Promise<AppearanceSettings>;
  setAppearance: (input: AppearanceSettings) => Promise<void>;
  getSession: () => Promise<WorkspaceSession>;
  setSession: (input: WorkspaceSession) => Promise<void>;
}

export interface HubPrefsApi {
  get: () => Promise<AppPrefs>;
  set: (input: AppPrefsPatch) => Promise<AppPrefs>;
}

export interface HubUpdatesApi {
  check: () => Promise<UpdateCheckResult>;
}

export interface HubProvidersApi {
  list: () => Promise<ProviderDto[]>;
}

export interface HubSecretsApi {
  list: () => Promise<ProviderKeyDto[]>;
  save: (input: SecretsSaveInput) => Promise<ProviderKeyDto>;
  remove: (input: IdInput) => Promise<void>;
  test: (input: SecretsTestInput) => Promise<SecretsTestResult>;
}

export interface HubSearchApi {
  query: (input: SearchInput) => Promise<SearchHit[]>;
}

export interface HubSpendCapsApi {
  get: () => Promise<SpendCapDto[]>;
  set: (input: SpendCapSetInput) => Promise<SpendCapDto[]>;
}
export interface HubScopedSpendCapsApi {
  get: () => Promise<ScopedSpendCapDto[]>;
  set: (input: ScopedSpendCapSetInput) => Promise<ScopedSpendCapDto[]>;
}

export interface HubHealthApi {
  summary: () => Promise<HealthSummaryDto[]>;
}

export interface HubCostsApi {
  aggregate: (input: CostsAggregateInput) => Promise<CostsAggregateResult>;
  monthly: (input: MonthlyCostsInput) => Promise<MonthlyCostsResult>;
}

export interface HubDebugApi {
  getLatest: () => Promise<DebugSnapshot | null>;
}

export interface HubImportApi {
  pickFile: () => Promise<ImportPickResult>;
  start: (input: ImportStartInput) => Promise<ImportStartResult>;
  cancel: (input: ImportCancelInput) => Promise<void>;
  onEvent: (listener: (event: ImportEvent) => void) => () => void;
}

export interface HubPacketsApi {
  list: (input: PacketsListInput) => Promise<ContextPacketDto[]>;
  compile: (input: PacketsCompileInput) => Promise<ContextPacketDto>;
  export: (input: PacketsExportInput) => Promise<PacketsExportResult>;
  pickFile: () => Promise<ImportPickResult>;
  import: (input: PacketsImportInput) => Promise<ContextPacketDto>;
  apply: (input: PacketsApplyInput) => Promise<ConversationDto>;
  clear: (input: PacketsClearInput) => Promise<ConversationDto>;
}

export interface HubFilesApi {
  list: (input: ProjectFileListInput) => Promise<ProjectFileDto[]>;
  attach: (input: FilesAttachInput) => Promise<ProjectFileDto[]>;
  fromDrop: (input: { projectId: string | null; files: unknown }) => Promise<ProjectFileDto[]>;
  remove: (input: FilesRemoveInput) => Promise<void>;
}

export interface HubMemoryApi {
  list: (input: MemoryListInput) => Promise<ProjectMemoryDto[]>;
  create: (input: MemoryCreateInput) => Promise<ProjectMemoryDto>;
  update: (input: MemoryUpdateInput) => Promise<ProjectMemoryDto>;
  remove: (input: IdInput) => Promise<void>;
  suggest: (input: MemorySuggestInput) => Promise<MemorySuggestResult>;
  getOptOut: (input: MemoryOptOutInput) => Promise<MemoryOptOutState>;
  setOptOut: (input: MemorySetOptOutInput) => Promise<MemoryOptOutState>;
}

export interface HubWorkspaceApi {
  get: (input: WorkspaceConversationInput) => Promise<ConversationWorkspaceDto>;
  refresh: (input: WorkspaceConversationInput) => Promise<ConversationWorkspaceDto>;
  addTask: (input: WorkspaceAddTaskInput) => Promise<ConversationTaskDto>;
  setTaskDone: (input: WorkspaceSetTaskDoneInput) => Promise<ConversationTaskDto>;
  removeTask: (input: IdInput) => Promise<void>;
}

export interface HubPromptsApi {
  list: () => Promise<PromptDto[]>;
  create: (input: PromptCreateInput) => Promise<PromptDto>;
  update: (input: PromptUpdateInput) => Promise<PromptDto>;
  remove: (input: IdInput) => Promise<void>;
  resolve: (input: PromptResolveInput) => Promise<PromptResolveResult>;
}

export interface HubPlaygroundApi {
  run: (input: PlaygroundRunInput) => Promise<PlaygroundRunResult>;
}
export interface HubCouncilApi { run: (input: CouncilRunInput) => Promise<CouncilRunResult>; }

export interface HubArtifactsApi {
  list: (input: ArtifactsListInput) => Promise<ArtifactDto[]>;
  get: (input: IdInput) => Promise<ArtifactDto>;
  saveVersion: (input: ArtifactSaveVersionInput) => Promise<ArtifactDto>;
  setPinned: (input: ArtifactPinInput) => Promise<ArtifactDto>;
  exportFile: (input: ArtifactExportInput) => Promise<ArtifactExportResult>;
}

export interface HubSkillsApi {
  list: () => Promise<SkillDto[]>;
  create: (input: SkillCreateInput) => Promise<SkillDto>;
  update: (input: SkillUpdateInput) => Promise<SkillDto>;
  remove: (input: IdInput) => Promise<void>;
  resolve: (input: SkillResolveInput) => Promise<SkillResolveResult>;
}

export interface HubChatApi {
  send: (input: ChatSendInput) => Promise<ChatSendResult>;
  abort: (input: ChatAbortInput) => Promise<void>;
  previewPacket: (input: PacketPreviewInput) => Promise<PacketPreviewResult>;
  onEvent: (listener: (event: ChatEvent) => void) => () => void;
}

export interface HubApi {
  platform: "win32" | "darwin" | "linux";
  window: HubWindowApi;
  quickAi: HubQuickAiApi;
  projects: HubProjectsApi;
  conversations: HubConversationsApi;
  messages: HubMessagesApi;
  settings: HubSettingsApi;
  prefs: HubPrefsApi;
  updates: HubUpdatesApi;
  providers: HubProvidersApi;
  secrets: HubSecretsApi;
  search: HubSearchApi;
  spendCaps: HubSpendCapsApi;
  scopedSpendCaps: HubScopedSpendCapsApi;
  health: HubHealthApi;
  costs: HubCostsApi;
  debug: HubDebugApi;
  chat: HubChatApi;
  import: HubImportApi;
  packets: HubPacketsApi;
  files: HubFilesApi;
  memory: HubMemoryApi;
  workspace: HubWorkspaceApi;
  prompts: HubPromptsApi;
  playground: HubPlaygroundApi;
  council: HubCouncilApi;
  artifacts: HubArtifactsApi;
  skills: HubSkillsApi;
}

export type { AppLocale, ThemeMode };
