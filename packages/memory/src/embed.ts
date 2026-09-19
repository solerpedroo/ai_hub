import { EMBEDDING_DIM } from "./types";

function hash32(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function addToken(vec: Float64Array, token: string): void {
  if (token.length === 0) {
    return;
  }
  const hashed = hash32(token);
  const index = hashed % EMBEDDING_DIM;
  const current = vec[index] ?? 0;
  vec[index] = current + ((hashed & 1) === 0 ? 1 : -1);
}

export function embedText(text: string): number[] {
  const vec = new Float64Array(EMBEDDING_DIM);
  const lowered = text.toLowerCase();
  for (let i = 0; i < lowered.length - 2; i += 1) {
    addToken(vec, lowered.slice(i, i + 3));
  }
  for (const token of lowered.split(/[^a-z0-9à-ÿ_+.-]+/i)) {
    if (token.length >= 2) {
      addToken(vec, token);
    }
  }
  let norm = 0;
  for (const value of vec) {
    norm += value * value;
  }
  const scale = Math.sqrt(norm) || 1;
  return Array.from(vec, (value) => value / scale);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i += 1) {
    dot += a[i]! * b[i]!;
  }
  return dot;
}
