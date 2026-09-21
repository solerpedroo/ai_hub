import type { ProviderAgnosticPacket } from "@ai-hub/shared";
import type { CouncilRole } from "@ai-hub/shared";
import type { EffortLevel } from "@ai-hub/shared";

export interface ModelRef {
  id: string;
  label: string;
}

export interface ProviderCapabilities {
  streaming: boolean;
  tools: boolean;
  thinking: boolean;
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
  effortLevel?: EffortLevel;
  thinkingBudget?: number;
  images?: ChatImagePart[];
  /** Dispatch-only metadata. It is never persisted in or merged into the context packet. */
  councilRole?: CouncilRole;
}

export function packetForDispatch(input: Pick<ChatStreamRequest, "packet" | "councilRole">): ProviderAgnosticPacket {
  // Dispatch metadata must never mutate the immutable context packet.
  return input.packet;
}

export function councilDispatchInstruction(role: CouncilRole | undefined): string | undefined {
  if (!role) return undefined;
  const lens: Record<CouncilRole, string> = {
    architect: "Analyze structure, trade-offs, and a concrete recommendation.",
    reviewer: "Find assumptions, gaps, and testable objections.",
    security: "Identify risks, abuse paths, and mitigations.",
    ux: "Identify user impact, clarity, and accessible next steps.",
  };
  return `Council role: ${role}. ${lens[role]}`;
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
