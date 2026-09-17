import type { MessageStatus, ProviderAgnosticPacket } from "@ai-hub/shared";
import { activePath, packetV0Schema, type MessageGraphNode } from "@ai-hub/shared";

export interface CompilerMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  status: MessageStatus;
}

export interface CompileInput {
  projectInstructions: string | null;
  extraSystem: string | null;
  messages: CompilerMessage[];
  maxTokenBudget?: number;
}

type PacketRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function tokenEstimateFromChars(chars: number): number {
  return Math.ceil(chars / 4);
}

function estimateTokens(system: string, rows: PacketRow[]): number {
  let chars = system.length;
  for (const row of rows) {
    chars += row.content.length;
  }
  return tokenEstimateFromChars(chars);
}

export function compilePacket(input: CompileInput): ProviderAgnosticPacket {
  const systemParts: string[] = [];
  if (input.projectInstructions && input.projectInstructions.trim().length > 0) {
    systemParts.push(input.projectInstructions.trim());
  }
  if (input.extraSystem && input.extraSystem.trim().length > 0) {
    systemParts.push(input.extraSystem.trim());
  }

  const excluded: string[] = [];
  const kept: PacketRow[] = [];

  for (const message of input.messages) {
    if (message.status === "streaming") {
      excluded.push(message.id);
      continue;
    }
    if (message.role === "system") {
      if (message.content.trim().length > 0) {
        systemParts.push(message.content.trim());
      }
      continue;
    }
    kept.push({ id: message.id, role: message.role, content: message.content });
  }

  const system = systemParts.join("\n\n");
  const budget = input.maxTokenBudget;
  if (budget !== undefined) {
    while (kept.length > 1 && estimateTokens(system, kept) > budget) {
      const dropped = kept.shift();
      if (dropped) {
        excluded.push(dropped.id);
      }
    }
  }

  return packetV0Schema.parse({
    version: 1,
    system,
    messages: kept.map((row) => ({ role: row.role, content: row.content })),
    tokenEstimate: estimateTokens(system, kept),
    excluded,
  });
}

export interface CompilerGraphMessage extends CompilerMessage, MessageGraphNode {}

export function compileActivePath(input: {
  projectInstructions: string | null;
  extraSystem: string | null;
  messages: CompilerGraphMessage[];
  maxTokenBudget?: number;
}): ProviderAgnosticPacket {
  const compiled: CompileInput = {
    projectInstructions: input.projectInstructions,
    extraSystem: input.extraSystem,
    messages: activePath(input.messages),
  };
  if (input.maxTokenBudget !== undefined) {
    compiled.maxTokenBudget = input.maxTokenBudget;
  }
  return compilePacket(compiled);
}
