export const IpcChannel = {
  windowMinimize: "window:minimize",
  windowMaximize: "window:maximize",
  windowClose: "window:close",
  windowIsMaximized: "window:isMaximized",
  projectsList: "projects:list",
  projectsCreate: "projects:create",
  projectsRemove: "projects:remove",
  conversationsList: "conversations:list",
  conversationsCreate: "conversations:create",
  conversationsRemove: "conversations:remove",
  messagesList: "messages:list",
  messagesCreate: "messages:create",
  settingsGetAppearance: "settings:getAppearance",
  settingsSetAppearance: "settings:setAppearance",
  providersList: "providers:list",
  secretsList: "secrets:list",
  secretsSave: "secrets:save",
  secretsRemove: "secrets:remove",
} as const;

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel];
