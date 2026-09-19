import type { MessageStatus, PacketPrivacyMode, PacketSlice, ProviderAgnosticPacket } from "@ai-hub/shared";
import { activePath, clipPacketLabel, packetV0Schema, type MessageGraphNode } from "@ai-hub/shared";

export interface CompilerMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  status: MessageStatus;
  pinned?: boolean;
}

export interface CompilerFile {
  id: string;
  name: string;
  text: string;
}

export interface CompileInput {
  projectInstructions: string | null;
  extraSystem: string | null;
  messages: CompilerMessage[];
  maxTokenBudget?: number;
  privacyMode?: PacketPrivacyMode;
  inactiveSummaries?: InactiveBranchSummaries | null;
  files?: CompilerFile[];
}

type PacketRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  pinned: boolean;
};

export interface CompileDetailedResult {
  packet: ProviderAgnosticPacket;
  included: PacketSlice[];
  omitted: PacketSlice[];
}

export interface InactiveBranchSummaries {
  block: string;
  slices: PacketSlice[];
}

export interface CompilerGraphMessage extends CompilerMessage, MessageGraphNode {
  branchId?: string;
}

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

function sliceFor(kind: PacketSlice["kind"], id: string | null, text: string): PacketSlice {
  const label = clipPacketLabel(text.length > 0 ? text : kind, 200);
  return {
    kind,
    id,
    label,
    tokens: tokenEstimateFromChars(text.length),
  };
}

function isPinned(message: CompilerMessage): boolean {
  return message.pinned === true;
}

export function summarizeInactiveBranches(messages: CompilerGraphMessage[]): InactiveBranchSummaries | null {
  const pathIds = new Set(activePath(messages).map((item) => item.id));
  const groups = new Map<string, CompilerGraphMessage[]>();
  const ordered = messages
    .filter(
      (item) =>
        !pathIds.has(item.id) &&
        item.status !== "streaming" &&
        (item.role === "user" || item.role === "assistant"),
    )
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  for (const item of ordered) {
    const key = item.branchId ?? item.parentId ?? "root";
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  if (groups.size === 0) {
    return null;
  }
  const lines: string[] = ["Inactive branches (not in the active path):"];
  const slices: PacketSlice[] = [];
  for (const group of groups.values()) {
    const last = group[group.length - 1];
    if (!last) {
      continue;
    }
    const lastLabel = clipPacketLabel(last.content, 80);
    const line = `${group.length} turns. Last: ${lastLabel}`;
    lines.push(`- ${line}`);
    slices.push(sliceFor("inactive-branch", last.id, line));
  }
  return { block: lines.join("\n"), slices };
}

export function compilePacketDetailed(input: CompileInput): CompileDetailedResult {
  const privacyMode: PacketPrivacyMode = input.privacyMode ?? "standard";
  const included: PacketSlice[] = [];
  const omitted: PacketSlice[] = [];
  const systemParts: string[] = [];

  const project = input.projectInstructions?.trim() ?? "";
  if (project.length > 0) {
    const slice = sliceFor("project-instructions", null, project);
    if (privacyMode === "strict") {
      omitted.push({ ...slice, kind: "privacy", label: clipPacketLabel(`Project instructions omitted (${privacyMode})`, 200) });
    } else {
      systemParts.push(project);
      included.push(slice);
    }
  }

  const extra = input.extraSystem?.trim() ?? "";
  if (extra.length > 0) {
    systemParts.push(extra);
    included.push(sliceFor("extra-system", null, extra));
  }

  for (const file of input.files ?? []) {
    const block = `Attached file: ${file.name}\n${file.text}`;
    systemParts.push(block);
    included.push({
      kind: "file",
      id: file.id,
      label: clipPacketLabel(`Attached file: ${file.name}`, 200),
      tokens: tokenEstimateFromChars(block.length),
    });
  }

  const inactive = input.inactiveSummaries ?? null;
  if (inactive && inactive.block.trim().length > 0) {
    if (privacyMode === "strict") {
      omitted.push(
        sliceFor("privacy", null, "Inactive branch summaries omitted (strict)"),
        ...inactive.slices.map((item) => ({ ...item, kind: "inactive-branch" as const })),
      );
    } else {
      systemParts.push(inactive.block.trim());
      included.push(...inactive.slices);
    }
  }

  const excluded: string[] = [];
  const kept: PacketRow[] = [];

  for (const message of input.messages) {
    if (message.status === "streaming") {
      excluded.push(message.id);
      omitted.push(sliceFor("old-message", message.id, message.content));
      continue;
    }
    if (message.role === "system") {
      if (message.content.trim().length > 0) {
        systemParts.push(message.content.trim());
        included.push(sliceFor("extra-system", message.id, message.content));
      }
      continue;
    }
    kept.push({
      id: message.id,
      role: message.role,
      content: message.content,
      pinned: isPinned(message),
    });
  }

  const budget = input.maxTokenBudget;
  if (budget !== undefined) {
    while (kept.length > 1 && estimateTokens(systemParts.join("\n\n"), kept) > budget) {
      const dropIndex = kept.findIndex((row, index) => !row.pinned && index < kept.length - 1);
      if (dropIndex < 0) {
        break;
      }
      const dropped = kept.splice(dropIndex, 1)[0];
      if (dropped) {
        excluded.push(dropped.id);
        omitted.push(sliceFor("old-message", dropped.id, dropped.content));
      }
    }
  }

  for (const row of kept) {
    included.push(sliceFor("message", row.id, row.content));
  }

  const system = systemParts.join("\n\n");
  const packet = packetV0Schema.parse({
    version: 1,
    system,
    messages: kept.map((row) => ({ role: row.role, content: row.content })),
    tokenEstimate: estimateTokens(system, kept),
    excluded,
  });
  return { packet, included: included.slice(0, 200), omitted: omitted.slice(0, 200) };
}

export function compilePacket(input: CompileInput): ProviderAgnosticPacket {
  return compilePacketDetailed(input).packet;
}

export function appendFilesToPacket(
  packet: ProviderAgnosticPacket,
  files: CompilerFile[],
): { packet: ProviderAgnosticPacket; included: PacketSlice[] } {
  if (files.length === 0) {
    return { packet, included: [] };
  }
  const blocks = files.map((file) => `Attached file: ${file.name}\n${file.text}`);
  const extra = blocks.join("\n\n");
  const system = packet.system.length > 0 ? `${packet.system}\n\n${extra}` : extra;
  return {
    packet: packetV0Schema.parse({
      ...packet,
      system,
      tokenEstimate: packet.tokenEstimate + tokenEstimateFromChars(extra.length),
    }),
    included: files.map((file) => ({
      kind: "file" as const,
      id: file.id,
      label: clipPacketLabel(`Attached file: ${file.name}`, 200),
      tokens: tokenEstimateFromChars(`Attached file: ${file.name}\n${file.text}`.length),
    })),
  };
}

export function compileActivePathDetailed(input: {
  projectInstructions: string | null;
  extraSystem: string | null;
  messages: CompilerGraphMessage[];
  maxTokenBudget?: number;
  privacyMode?: PacketPrivacyMode;
  files?: CompilerFile[];
}): CompileDetailedResult {
  const compiled: CompileInput = {
    projectInstructions: input.projectInstructions,
    extraSystem: input.extraSystem,
    messages: activePath(input.messages),
    inactiveSummaries: summarizeInactiveBranches(input.messages),
  };
  if (input.maxTokenBudget !== undefined) {
    compiled.maxTokenBudget = input.maxTokenBudget;
  }
  if (input.privacyMode !== undefined) {
    compiled.privacyMode = input.privacyMode;
  }
  if (input.files !== undefined) {
    compiled.files = input.files;
  }
  return compilePacketDetailed(compiled);
}

export function compileActivePath(input: {
  projectInstructions: string | null;
  extraSystem: string | null;
  messages: CompilerGraphMessage[];
  maxTokenBudget?: number;
  privacyMode?: PacketPrivacyMode;
}): ProviderAgnosticPacket {
  return compileActivePathDetailed(input).packet;
}

export function mergePacketWithTail(
  payload: ProviderAgnosticPacket,
  tail: CompilerMessage[],
  maxTokenBudget?: number,
): CompileDetailedResult {
  const omitted: PacketSlice[] = [];
  const excluded = [...payload.excluded];
  const frozen: PacketRow[] = payload.messages.map((row, index) => ({
    id: `frozen-${index}`,
    role: row.role,
    content: row.content,
    pinned: true,
  }));
  const live: PacketRow[] = [];
  for (const item of tail) {
    if (item.status === "streaming") {
      excluded.push(item.id);
      omitted.push(sliceFor("old-message", item.id, item.content));
      continue;
    }
    if (item.role === "system") {
      continue;
    }
    live.push({
      id: item.id,
      role: item.role,
      content: item.content,
      pinned: isPinned(item),
    });
  }
  let kept = [...frozen, ...live];
  const system = payload.system;
  if (maxTokenBudget !== undefined) {
    while (kept.length > 1 && estimateTokens(system, kept) > maxTokenBudget) {
      const dropIndex = kept.findIndex((row, index) => !row.pinned && index < kept.length - 1);
      if (dropIndex < 0) {
        break;
      }
      const dropped = kept.splice(dropIndex, 1)[0];
      if (dropped) {
        excluded.push(dropped.id);
        omitted.push(sliceFor("old-message", dropped.id, dropped.content));
      }
    }
  }
  const included: PacketSlice[] = [
    ...(system.length > 0 ? [sliceFor("extra-system", null, system)] : []),
    ...kept.map((row) => sliceFor("message", row.id.startsWith("frozen-") ? null : row.id, row.content)),
  ];
  const packet = packetV0Schema.parse({
    version: 1,
    system,
    messages: kept.map((row) => ({ role: row.role, content: row.content })),
    tokenEstimate: estimateTokens(system, kept),
    excluded,
  });
  return { packet, included: included.slice(0, 200), omitted: omitted.slice(0, 200) };
}
