export const IpcChannel = {
  windowMinimize: "window:minimize",
  windowMaximize: "window:maximize",
  windowClose: "window:close",
  windowIsMaximized: "window:isMaximized",
} as const;

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel];
