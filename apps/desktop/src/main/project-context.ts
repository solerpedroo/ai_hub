import type { CompilerMention } from "@ai-hub/ai-gateway";
import type { HubRepos } from "@ai-hub/db";
import {
  allowsProjectContext,
  MAX_AUTO_MEMORY_TOKENS,
  MAX_RAG_TOKENS,
  retrieveChunks,
  type EmbeddedChunk,
} from "@ai-hub/memory";
import { redactSecrets } from "@ai-hub/security";
import { mentionTokenEstimate, type PacketPrivacyMode } from "@ai-hub/shared";

export function loadAutoProjectContext(
  repos: HubRepos,
  projectId: string | null,
  query: string,
  privacyMode: PacketPrivacyMode,
  skipMemoryIds: ReadonlySet<string>,
): CompilerMention[] {
  if (!projectId || !allowsProjectContext(privacyMode)) {
    return [];
  }
  const mentions: CompilerMention[] = [];
  if (!repos.getMemoryOptOut(projectId)) {
    let used = 0;
    for (const memory of repos.listProjectMemories(projectId)) {
      if (skipMemoryIds.has(memory.id) || used >= MAX_AUTO_MEMORY_TOKENS) {
        continue;
      }
      const text = redactSecrets(memory.body);
      const tokens = mentionTokenEstimate(text.length);
      if (used + tokens > MAX_AUTO_MEMORY_TOKENS) {
        continue;
      }
      used += tokens;
      mentions.push({
        kind: "memory",
        id: memory.id,
        name: memory.title,
        text,
      });
    }
  }
  const chunks: EmbeddedChunk[] = repos.listFileChunks(projectId).map((row) => ({
    id: row.id,
    fileId: row.fileId,
    fileName: row.fileName,
    chunkIndex: row.chunkIndex,
    text: row.text,
    embedding: row.embedding,
    tokenEstimate: row.tokenEstimate,
  }));
  const hits = retrieveChunks(query, chunks, { maxTokens: MAX_RAG_TOKENS });
  for (const hit of hits) {
    mentions.push({
      kind: "rag",
      id: hit.id,
      name: `${hit.fileName}#c${hit.chunkIndex}`,
      text: redactSecrets(hit.text),
    });
  }
  return mentions;
}
