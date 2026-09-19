export const EMBEDDING_DIM = 128;
export const CHUNK_TARGET_CHARS = 1_200;
export const CHUNK_OVERLAP_CHARS = 120;
export const MAX_RAG_HITS = 6;
export const MAX_RAG_TOKENS = 4_000;
export const MAX_AUTO_MEMORY_TOKENS = 2_000;
export const MIN_RETRIEVAL_SCORE = 0.04;

export interface TextChunk {
  index: number;
  text: string;
  tokenEstimate: number;
}

export interface EmbeddedChunk {
  id: string;
  fileId: string;
  fileName: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
  tokenEstimate: number;
}

export interface RetrievalHit {
  id: string;
  fileId: string;
  fileName: string;
  chunkIndex: number;
  text: string;
  score: number;
  tokenEstimate: number;
}
