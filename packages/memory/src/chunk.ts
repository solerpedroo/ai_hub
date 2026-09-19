import { CHUNK_OVERLAP_CHARS, CHUNK_TARGET_CHARS, type TextChunk } from "./types";

export function tokenEstimateFromChars(chars: number): number {
  return Math.max(1, Math.ceil(chars / 4));
}

export function chunkText(text: string): TextChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length === 0) {
    return [];
  }
  const blocks = normalized.split(/\n{2,}/).map((block) => block.trim()).filter((block) => block.length > 0);
  const pieces: string[] = [];
  for (const block of blocks) {
    if (block.length <= CHUNK_TARGET_CHARS) {
      pieces.push(block);
      continue;
    }
    let offset = 0;
    while (offset < block.length) {
      const end = Math.min(block.length, offset + CHUNK_TARGET_CHARS);
      pieces.push(block.slice(offset, end).trim());
      if (end >= block.length) {
        break;
      }
      offset = Math.max(offset + 1, end - CHUNK_OVERLAP_CHARS);
    }
  }
  return pieces
    .filter((item) => item.length > 0)
    .map((item, index) => ({
      index,
      text: item,
      tokenEstimate: tokenEstimateFromChars(item.length),
    }));
}
