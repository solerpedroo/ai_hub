import type { HubApi } from "@ai-hub/shared";

declare global {
  interface Window {
    hub: HubApi;
  }
}

export {};
