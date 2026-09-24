import { z } from "zod";

/** Extract editable checklist titles from an assistant reply (AI Tasks). */
export function parseChecklistItems(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const items: string[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    const line = raw.trim();
    const match =
      /^[-*+]\s+\[[ xX]\]\s+(.+)$/.exec(line) ??
      /^[☐□✅☑]\s*(.+)$/.exec(line) ??
      /^[-*+]\s+(.+)$/.exec(line);
    if (!match) continue;
    const title = (match[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 240);
    if (title.length < 2) continue;
    // Skip markdown headings mistaken as bullets and section labels.
    if (/^#{1,6}\s/.test(title) || /^checklist:?$/i.test(title)) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(title);
    if (items.length >= 40) break;
  }
  return items;
}

export const checklistItemsSchema = z.array(z.string().min(1).max(240)).max(40);
