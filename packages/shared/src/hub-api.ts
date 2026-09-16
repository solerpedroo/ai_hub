import type { AppLocale, ThemeMode } from "./appearance";

export interface HubWindowApi {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
}

export interface HubApi {
  platform: "win32" | "darwin" | "linux";
  window: HubWindowApi;
}

export type { AppLocale, ThemeMode };
