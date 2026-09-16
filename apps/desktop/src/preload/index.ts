import { contextBridge, ipcRenderer } from "electron";
import {
  IpcChannel,
  type HubApi,
  emptyIpcPayloadSchema,
  ipcAckResultSchema,
  windowIsMaximizedResultSchema,
} from "@ai-hub/shared";

const empty = emptyIpcPayloadSchema.parse({});

async function invokeAck(channel: string): Promise<void> {
  const result: unknown = await ipcRenderer.invoke(channel, empty);
  ipcAckResultSchema.parse(result);
}

const hub: HubApi = {
  platform:
    process.platform === "darwin" || process.platform === "linux" ? process.platform : "win32",
  window: {
    minimize: () => invokeAck(IpcChannel.windowMinimize),
    maximize: () => invokeAck(IpcChannel.windowMaximize),
    close: () => invokeAck(IpcChannel.windowClose),
    isMaximized: async () => {
      const result: unknown = await ipcRenderer.invoke(IpcChannel.windowIsMaximized, empty);
      return windowIsMaximizedResultSchema.parse(result);
    },
  },
};

contextBridge.exposeInMainWorld("hub", hub);
