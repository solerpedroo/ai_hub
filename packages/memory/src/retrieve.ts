import { cosineSimilarity, embedText } from "./embed";
import { MAX_RAG_HITS, MAX_RAG_TOKENS, MIN_RETRIEVAL_SCORE, type EmbeddedChunk, type RetrievalHit } from "./types";

export function retrieveChunks(
  query: string,
  chunks: EmbeddedChunk[],
  options?: { k?: number; maxTokens?: number; minScore?: number },
): RetrievalHit[] {
  const trimmed = query.trim();
  if (trimmed.length === 0 || chunks.length === 0) {
    return [];
  }
  const k = options?.k ?? MAX_RAG_HITS;
  const maxTokens = options?.maxTokens ?? MAX_RAG_TOKENS;
  const minScore = options?.minScore ?? MIN_RETRIEVAL_SCORE;
  const queryVec = embedText(trimmed);
  const ranked = chunks
    .map((chunk) => ({
      id: chunk.id,
      fileId: chunk.fileId,
      fileName: chunk.fileName,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      score: cosineSimilarity(queryVec, chunk.embedding),
      tokenEstimate: chunk.tokenEstimate,
    }))
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score);
  const picked: RetrievalHit[] = [];
  let used = 0;
  for (const item of ranked) {
    if (picked.length >= k || used + item.tokenEstimate > maxTokens) {
      break;
    }
    picked.push(item);
    used += item.tokenEstimate;
  }
  return picked;
}
