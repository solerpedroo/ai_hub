import type { MessageStatus, ProviderAgnosticPacket } from "@ai-hub/shared";
import { packetV0Schema } from "@ai-hub/shared";

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
}

function tokenEstimateFromChars(chars: number): number {
  return Math.ceil(chars / 4);
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
  const packetMessages: { role: "user" | "assistant"; content: string }[] = [];

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
    packetMessages.push({ role: message.role, content: message.content });
  }

  const system = systemParts.join("\n\n");
  let chars = system.length;
  for (const message of packetMessages) {
    chars += message.content.length;
  }

  return packetV0Schema.parse({
    version: 1,
    system,
    messages: packetMessages,
    tokenEstimate: tokenEstimateFromChars(chars),
    excluded,
  });
}
