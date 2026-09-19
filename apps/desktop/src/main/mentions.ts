import type { CompilerMention } from "@ai-hub/ai-gateway";
import type { HubRepos } from "@ai-hub/db";
import { redactSecrets } from "@ai-hub/security";
import {
  MAX_MENTION_TOKENS,
  MAX_MENTIONS_PER_SEND,
  isMentionStubType,
  mentionTokenEstimate,
  portablePacketV1Schema,
  type MentionRef,
} from "@ai-hub/shared";

export function resolveSendMentions(
  repos: HubRepos,
  refs: MentionRef[] | undefined,
  projectId: string | null,
  currentConversationId: string,
  mode: "preview" | "send" = "send",
): { fileIds: string[]; mentions: CompilerMention[] } {
  if (!refs || refs.length === 0) {
    return { fileIds: [], mentions: [] };
  }
  if (refs.length > MAX_MENTIONS_PER_SEND) {
    throw new Error("mentions:limit");
  }
  const fileIds: string[] = [];
  const mentions: CompilerMention[] = [];
  let usedTokens = 0;
  const seen = new Set<string>();
  for (const ref of refs) {
    if (ref.id === undefined && (ref.query === undefined || ref.query.length === 0)) {
      if (mode === "preview") {
        continue;
      }
      throw new Error("mentions:not_found");
    }
    const key = `${ref.type}:${ref.id ?? ref.query ?? ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    try {
      if (isMentionStubType(ref.type)) {
        throw new Error("mentions:unavailable");
      }
      if (ref.type === "file") {
        const file = resolveProjectFile(repos, projectId, ref);
        if (seen.has(`file:${file.id}`)) {
          continue;
        }
        seen.add(`file:${file.id}`);
        fileIds.push(file.id);
        continue;
      }
      if (usedTokens >= MAX_MENTION_TOKENS) {
        continue;
      }
      const remaining = MAX_MENTION_TOKENS - usedTokens;
      if (ref.type === "conversation") {
        const mention = resolveConversationMention(repos, projectId, currentConversationId, ref, remaining);
        if (mention) {
          if (seen.has(`conversation:${mention.id}`)) {
            continue;
          }
          seen.add(`conversation:${mention.id}`);
          usedTokens += mentionTokenEstimate(mention.text.length);
          mentions.push(mention);
        }
        continue;
      }
      const packet = resolvePacketMention(repos, projectId, ref, remaining);
      if (seen.has(`packet:${packet.id}`)) {
        continue;
      }
      seen.add(`packet:${packet.id}`);
      usedTokens += mentionTokenEstimate(packet.text.length);
      mentions.push(packet);
    } catch (error) {
      if (mode === "preview" && error instanceof Error && error.message.startsWith("mentions:")) {
        continue;
      }
      throw error;
    }
  }
  return { fileIds, mentions };
}

function resolveProjectFile(
  repos: HubRepos,
  projectId: string | null,
  ref: MentionRef,
): { id: string } {
  if (ref.id) {
    const row = repos.getProjectFile(ref.id);
    if (!row || row.projectId !== projectId) {
      throw new Error("mentions:not_found");
    }
    return row;
  }
  const query = (ref.query ?? "").toLowerCase();
  const match = repos
    .listProjectFiles(projectId)
    .find(
      (item) => item.name.toLowerCase() === query || item.name.toLowerCase().endsWith(`/${query}`),
    );
  if (!match) {
    throw new Error("mentions:not_found");
  }
  return match;
}

function resolveConversationMention(
  repos: HubRepos,
  projectId: string | null,
  currentConversationId: string,
  ref: MentionRef,
  remainingTokens: number,
): CompilerMention | null {
  const conversation = ref.id
    ? repos.getConversation(ref.id)
    : repos
        .listConversations(projectId)
        .find((item) => item.title.toLowerCase() === (ref.query ?? "").toLowerCase());
  if (!conversation || conversation.projectId !== projectId) {
    throw new Error("mentions:not_found");
  }
  if (conversation.id === currentConversationId) {
    return null;
  }
  const path = repos.listActivePath(conversation.id);
  const lines: string[] = [];
  for (const message of path) {
    if (message.role === "system") {
      continue;
    }
    const next = `${message.role}: ${redactSecrets(message.content)}`;
    const candidate = [...lines, next].join("\n");
    if (mentionTokenEstimate(candidate.length) > remainingTokens) {
      break;
    }
    lines.push(next);
  }
  return {
    kind: "conversation",
    id: conversation.id,
    name: conversation.title,
    text: lines.join("\n") || "(empty)",
  };
}

function resolvePacketMention(
  repos: HubRepos,
  projectId: string | null,
  ref: MentionRef,
  remainingTokens: number,
): CompilerMention {
  const packets = repos.listContextPackets(projectId);
  const meta = ref.id
    ? packets.find((item) => item.id === ref.id)
    : packets.find((item) => {
        const query = (ref.query ?? "").toLowerCase();
        return (
          item.origin.conversationLabel.toLowerCase() === query ||
          item.origin.projectLabel.toLowerCase() === query
        );
      });
  if (!meta || meta.projectId !== projectId) {
    throw new Error("mentions:not_found");
  }
  const stored = repos.getContextPacket(meta.id);
  if (!stored) {
    throw new Error("mentions:not_found");
  }
  const envelope = portablePacketV1Schema.parse(JSON.parse(stored.payloadJson) as unknown);
  const raw = redactSecrets(
    [envelope.payload.system, ...envelope.payload.messages.map((item) => `${item.role}: ${item.content}`)].join(
      "\n",
    ),
  );
  const maxChars = Math.max(4, remainingTokens * 4);
  return {
    kind: "packet",
    id: stored.id,
    name: `${stored.origin.projectLabel} / ${stored.origin.conversationLabel}`,
    text: raw.length > maxChars ? `${raw.slice(0, maxChars - 1)}…` : raw,
  };
}
