import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { BrowserWindow, dialog, type OpenDialogOptions, type WebContents } from "electron";
import { appendMentionsToPacket, compileActivePathDetailed } from "@ai-hub/ai-gateway";
import { applyContextFirewall, redactSecrets, type FirewallPolicy } from "@ai-hub/security";
import {
  contextPacketDtoSchema,
  findCatalogModel,
  importPickResultSchema,
  packetsExportResultSchema,
  portablePacketFromCompile,
  portablePacketV1Schema,
  packetV0Schema,
  type ContextPacketDto,
  type ImportPickResult,
  type PacketsCompileInput,
  type PacketsExportInput,
  type PacketsExportResult,
  type PacketsImportInput,
} from "@ai-hub/shared";
import { isE2eMode } from "./e2e-mode";
import { getHubDatabase } from "./persistence";
import { loadAutoProjectContext } from "./project-context";

const tickets = new Map<string, { path: string; fileName: string }>();
const MAX_PACKET_BYTES = 2_000_000;

function firewallPacketPayload(payload: Parameters<typeof packetV0Schema.parse>[0], policy: FirewallPolicy) {
  const safe = (text: string): string => {
    const result = applyContextFirewall(text, policy);
    if (result.blocked.length > 0) throw new Error(`firewall:blocked:${result.blocked.join(",")}`);
    return result.maskedText;
  };
  const parsed = packetV0Schema.parse(payload);
  return packetV0Schema.parse({
    ...parsed,
    system: safe(parsed.system),
    messages: parsed.messages.map((message) => ({ ...message, content: safe(message.content) })),
  });
}

function firewallEnvelope(envelope: Parameters<typeof portablePacketV1Schema.parse>[0], policy: FirewallPolicy) {
  const safe = (text: string): string => {
    const result = applyContextFirewall(text, policy);
    if (result.blocked.length > 0) throw new Error(`firewall:blocked:${result.blocked.join(",")}`);
    return result.maskedText;
  };
  const parsed = portablePacketV1Schema.parse(envelope);
  return portablePacketV1Schema.parse({
    ...parsed,
    origin: { ...parsed.origin, projectLabel: safe(parsed.origin.projectLabel), conversationLabel: safe(parsed.origin.conversationLabel) },
    included: parsed.included.map((slice) => ({ ...slice, label: safe(slice.label) })),
    omitted: parsed.omitted.map((slice) => ({ ...slice, label: safe(slice.label) })),
    payload: firewallPacketPayload(parsed.payload, policy),
  });
}

function toPacketDto(row: {
  id: string;
  projectId: string | null;
  tokenEstimate: number | null;
  privacyMode: "private" | "normal" | "maximum" | "standard" | "strict";
  origin: { source: "compile" | "import"; projectLabel: string; conversationLabel: string };
  createdAt: string;
}): ContextPacketDto {
  return contextPacketDtoSchema.parse({
    id: row.id,
    projectId: row.projectId,
    tokenEstimate: row.tokenEstimate,
    privacyMode: row.privacyMode,
    origin: row.origin,
    createdAt: row.createdAt,
  });
}

function filePart(title: string): string {
  const cleaned = Array.from(title)
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (code < 32 || '<>:"/\\|?*'.includes(ch)) {
        return "_";
      }
      return ch;
    })
    .join("")
    .trim();
  return (cleaned.length > 0 ? cleaned : "packet").slice(0, 60);
}

export function listProjectPackets(projectId: string | null): ContextPacketDto[] {
  return getHubDatabase().repos.listContextPackets(projectId).map((row) => toPacketDto(row));
}

export function compileAndSavePacket(input: PacketsCompileInput): ContextPacketDto {
  const repos = getHubDatabase().repos;
  const conversation = repos.getConversation(input.conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }
  const project = conversation.projectId ? repos.getProject(conversation.projectId) : null;
  const extraSystem =
    input.extraSystem !== undefined && input.extraSystem.trim().length > 0 ? input.extraSystem.trim() : null;
  const privacyMode = repos.getAppPrefs().privacyMode;
  const catalog =
    input.model && input.providerSlug ? findCatalogModel(input.model, input.providerSlug) : null;
  const compiled = {
    projectInstructions: project?.instructions ?? null,
    extraSystem,
    privacyMode,
    messages: repos.listMessages(input.conversationId).map((item) => ({
      id: item.id,
      parentId: item.parentId,
      isActiveBranch: item.isActiveBranch,
      createdAt: item.createdAt,
      role: item.role,
      content: item.content,
      status: item.status,
      branchId: item.branchId,
      ...(item.pinned ? { pinned: true } : {}),
    })),
  };
  const detailed = compileActivePathDetailed(
    input.compact === true ? { ...compiled, maxTokenBudget: catalog?.contextWindow ?? 128_000 } : compiled,
  );
  const lastUser = [...compiled.messages].reverse().find((item) => item.role === "user")?.content ?? "";
  const autoContext = loadAutoProjectContext(
    repos,
    conversation.projectId,
    lastUser,
    privacyMode,
    new Set(),
  );
  const withContext = appendMentionsToPacket(detailed.packet, autoContext);
  const envelope = firewallEnvelope(portablePacketFromCompile({
    privacyMode,
    origin: {
      source: "compile",
      projectLabel: (project?.name ?? "").slice(0, 200),
      conversationLabel: conversation.title.slice(0, 200),
    },
    included: [...detailed.included, ...withContext.included],
    omitted: detailed.omitted,
    payload: firewallPacketPayload(withContext.packet, repos.getAppPrefs().firewallPolicy),
  }), repos.getAppPrefs().firewallPolicy);
  const payloadJson = redactSecrets(JSON.stringify(envelope));
  const stored = repos.createContextPacket({
    projectId: conversation.projectId,
    privacyMode,
    origin: envelope.origin,
    tokenEstimate: envelope.payload.tokenEstimate,
    payloadJson,
  });
  return toPacketDto(stored);
}

export async function exportSavedPacket(
  input: PacketsExportInput,
  sender: WebContents,
): Promise<PacketsExportResult> {
  const stored = getHubDatabase().repos.getContextPacket(input.packetId);
  if (!stored) {
    throw new Error("Packet not found");
  }
  const parsed = portablePacketV1Schema.parse(JSON.parse(stored.payloadJson) as unknown);
  const payload = redactSecrets(JSON.stringify(parsed, null, 2));
  const fixture = process.env.AI_HUB_E2E_PACKET_FILE;
  if (isE2eMode() && fixture && fixture.trim().length > 0) {
    try {
      await writeFile(fixture, payload, "utf8");
    } catch {
      throw new Error("Packet file could not be written");
    }
    return packetsExportResultSchema.parse({ status: "saved" });
  }
  const window = BrowserWindow.fromWebContents(sender);
  const options = {
    defaultPath: `${filePart(stored.origin.conversationLabel || "packet")}.aihub-packet.json`,
    filters: [{ name: "AI Hub packet", extensions: ["aihub-packet.json", "json"] }],
  };
  const choice = window
    ? await dialog.showSaveDialog(window, options)
    : await dialog.showSaveDialog(options);
  if (choice.canceled || !choice.filePath) {
    return packetsExportResultSchema.parse({ status: "cancelled" });
  }
  try {
    await writeFile(choice.filePath, payload, "utf8");
  } catch {
    throw new Error("Packet file could not be written");
  }
  return packetsExportResultSchema.parse({ status: "saved" });
}

export async function pickPacketFile(sender: WebContents): Promise<ImportPickResult> {
  const fixture = process.env.AI_HUB_E2E_PACKET_FILE;
  if (isE2eMode() && fixture && fixture.trim().length > 0) {
    tickets.clear();
    const ticket = randomUUID();
    const fileName = basename(fixture);
    tickets.set(ticket, { path: fixture, fileName });
    return importPickResultSchema.parse({ status: "picked", ticket, fileName });
  }
  const window = BrowserWindow.fromWebContents(sender);
  const options: OpenDialogOptions = {
    properties: ["openFile"],
    filters: [
      { name: "AI Hub packet", extensions: ["aihub-packet.json", "json"] },
      { name: "JSON", extensions: ["json"] },
    ],
  };
  const choice = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
  const selected = choice.filePaths[0];
  if (choice.canceled || !selected) {
    return importPickResultSchema.parse({ status: "cancelled" });
  }
  tickets.clear();
  const ticket = randomUUID();
  const fileName = basename(selected);
  tickets.set(ticket, { path: selected, fileName });
  return importPickResultSchema.parse({ status: "picked", ticket, fileName });
}

export async function importPacketFile(input: PacketsImportInput): Promise<ContextPacketDto> {
  const ticket = tickets.get(input.ticket);
  if (!ticket) {
    throw new Error("Packet file is no longer available. Pick the file again.");
  }
  tickets.delete(input.ticket);
  const repos = getHubDatabase().repos;
  const project = repos.getProject(input.projectId);
  if (!project) {
    throw new Error("Project not found");
  }
  let bytes: Buffer;
  try {
    bytes = await readFile(ticket.path);
  } catch {
    throw new Error("Packet file could not be read");
  }
  if (bytes.byteLength > MAX_PACKET_BYTES) {
    throw new Error("Packet file is too large");
  }
  const parsed = portablePacketV1Schema.parse(JSON.parse(bytes.toString("utf8")) as unknown);
  const redacted = portablePacketV1Schema.parse(JSON.parse(redactSecrets(JSON.stringify(parsed))) as unknown);
  const safePacket = firewallEnvelope(redacted, repos.getAppPrefs().firewallPolicy);
  const stored = repos.createContextPacket({
    projectId: project.id,
    privacyMode: safePacket.privacyMode,
    origin: {
      source: "import",
      projectLabel: safePacket.origin.projectLabel,
      conversationLabel: safePacket.origin.conversationLabel,
    },
    tokenEstimate: safePacket.payload.tokenEstimate,
    payloadJson: redactSecrets(JSON.stringify(safePacket)),
  });
  return toPacketDto(stored);
}
