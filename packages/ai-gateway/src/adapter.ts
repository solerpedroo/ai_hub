import type { ProviderAgnosticPacket } from "@ai-hub/shared";

export interface ModelRef {
  id: string;
  label: string;
}

export interface ProviderCapabilities {
  streaming: boolean;
  tools: boolean;
}

export interface ChatImagePart {
  mime: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  data: string;
}

export interface ChatStreamRequest {
  secret: string;
  model: string;
  packet: ProviderAgnosticPacket;
  signal: AbortSignal;
  temperature?: number;
  maxTokens?: number | null;
  images?: ChatImagePart[];
}

export type ChatStreamEvent =
  | { type: "delta"; text: string }
  | { type: "usage"; tokensIn: number; tokensOut: number; costUsd?: string };

export interface ProviderAdapter {
  readonly id: string;
  listModels: () => ModelRef[];
  capabilities: () => ProviderCapabilities;
  testConnection: (secret: string, signal: AbortSignal) => Promise<void>;
  chatStream: (request: ChatStreamRequest) => AsyncIterable<ChatStreamEvent>;
}
