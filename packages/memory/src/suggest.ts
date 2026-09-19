const FACT_LINE =
  /(?:^|[.!?]\s+)((?:(?:nós\s+)?usamos|we\s+use|we\s+used|we\s+decided|decidimos|este\s+projeto|this\s+project|backend\s+usa)[^.!?\n]{8,160})/gi;

export function suggestMemories(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const hay = text.replace(/\s+/g, " ").trim();
  if (hay.length === 0) {
    return [];
  }
  for (const match of hay.matchAll(FACT_LINE)) {
    const raw = (match[1] ?? "").trim();
    const key = raw.toLowerCase();
    if (raw.length < 12 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(raw.slice(0, 240));
    if (out.length >= 4) {
      break;
    }
  }
  return out;
}

export function titleFromMemoryBody(body: string): string {
  const clipped = body.trim().replace(/\s+/g, " ").slice(0, 80);
  return clipped.length > 0 ? clipped : "Memory";
}
