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
  ConversationExportResult,
  ConversationListInput,
  IdInput,
  MessageCreateInput,
  MessageDto,
  MessageListInput,
  MessageUpdateInput,
  ProjectCreateInput,
  ProjectDto,
  ProviderDto,
  ProviderKeyDto,
  SecretsSaveInput,
  SecretsTestInput,
  SecretsTestResult,
  WorkspaceSession,
} from "./ipc-schemas";

export interface HubWindowApi {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
}

export interface HubProjectsApi {
  list: () => Promise<ProjectDto[]>;
  create: (input: ProjectCreateInput) => Promise<ProjectDto>;
  remove: (input: IdInput) => Promise<void>;
}

export interface HubConversationsApi {
  list: (input: ConversationListInput) => Promise<ConversationDto[]>;
  create: (input: ConversationCreateInput) => Promise<ConversationDto>;
  remove: (input: IdInput) => Promise<void>;
  export: (input: ConversationExportInput) => Promise<ConversationExportResult>;
  getBranchLabels: (input: BranchLabelsGetInput) => Promise<BranchLabels>;
  setBranchLabel: (input: BranchLabelSetInput) => Promise<void>;
}

export interface HubMessagesApi {
  list: (input: MessageListInput) => Promise<MessageDto[]>;
  create: (input: MessageCreateInput) => Promise<MessageDto>;
  update: (input: MessageUpdateInput) => Promise<MessageDto>;
  activate: (input: IdInput) => Promise<void>;
}

export interface HubSettingsApi {
  getAppearance: () => Promise<AppearanceSettings>;
  setAppearance: (input: AppearanceSettings) => Promise<void>;
  getSession: () => Promise<WorkspaceSession>;
  setSession: (input: WorkspaceSession) => Promise<void>;
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

export interface HubChatApi {
  send: (input: ChatSendInput) => Promise<ChatSendResult>;
  abort: (input: ChatAbortInput) => Promise<void>;
  onEvent: (listener: (event: ChatEvent) => void) => () => void;
}

export interface HubApi {
  platform: "win32" | "darwin" | "linux";
  window: HubWindowApi;
  projects: HubProjectsApi;
  conversations: HubConversationsApi;
  messages: HubMessagesApi;
  settings: HubSettingsApi;
  providers: HubProvidersApi;
  secrets: HubSecretsApi;
  chat: HubChatApi;
}

export type { AppLocale, ThemeMode };
