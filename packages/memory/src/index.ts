export {
  CHUNK_OVERLAP_CHARS,
  CHUNK_TARGET_CHARS,
  EMBEDDING_DIM,
  MAX_AUTO_MEMORY_TOKENS,
  MAX_RAG_HITS,
  MAX_RAG_TOKENS,
  MIN_RETRIEVAL_SCORE,
  type EmbeddedChunk,
  type RetrievalHit,
  type TextChunk,
} from "./types";
export { chunkText, tokenEstimateFromChars } from "./chunk";
export { cosineSimilarity, embedText } from "./embed";
export { retrieveChunks } from "./retrieve";
export { suggestMemories, titleFromMemoryBody } from "./suggest";
export { allowsProjectContext } from "./privacy";
export { buildWorkspaceSnapshot, type WorkspaceMessageLike, type WorkspaceSnapshot } from "./workspace";
