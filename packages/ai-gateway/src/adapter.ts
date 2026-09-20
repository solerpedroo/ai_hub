import type { ProviderAgnosticPacket } from "@ai-hub/shared";
import type { CouncilRole } from "@ai-hub/shared";

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
  /** Dispatch-only metadata. It is never persisted in or merged into the context packet. */
  councilRole?: CouncilRole;
}

const COUNCIL_ROLE_INSTRUCTIONS: Record<CouncilRole, string> = {
  architect: "Analyze structure, trade-offs, and a concrete recommendation.",
  reviewer: "Find assumptions, gaps, and testable objections.",
  security: "Identify risks, abuse paths, and mitigations.",
  ux: "Identify user impact, clarity, and accessible next steps.",
};

export function packetForDispatch(input: Pick<ChatStreamRequest, "packet" | "councilRole">): ProviderAgnosticPacket {
  if (!input.councilRole) return input.packet;
  return {
    ...input.packet,
    system: `${input.packet.system}\n\nCouncil role: ${input.councilRole}. ${COUNCIL_ROLE_INSTRUCTIONS[input.councilRole]}`,
    tokenEstimate: input.packet.tokenEstimate + Math.ceil(COUNCIL_ROLE_INSTRUCTIONS[input.councilRole].length / 4),
  };
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
