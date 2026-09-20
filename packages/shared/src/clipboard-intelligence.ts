export type ClipboardInsightKind = "json" | "stack_trace" | "text";

export interface ClipboardInsight {
  kind: ClipboardInsightKind;
  formatted: string | null;
}

export function inspectClipboardText(value: string): ClipboardInsight {
  const text = value.trim();
  if (text.length === 0) return { kind: "text", formatted: null };
  try {
    const parsed: unknown = JSON.parse(text);
    return { kind: "json", formatted: JSON.stringify(parsed, null, 2) };
  } catch {
    // JSON is optional intelligence; ordinary clipboard text remains usable.
  }
  const stackLike = /(?:\bat\s+.+\(.+?:\d+:\d+\)|\b(?:Error|Exception):.+|Traceback \(most recent call last\))/m.test(text);
  return { kind: stackLike ? "stack_trace" : "text", formatted: null };
}

export function typescriptInterfaceFromJson(value: string, name = "ClipboardData"): string | null {
  try {
    return `interface ${safeIdentifier(name)} ${renderType(JSON.parse(value), 0)}`;
  } catch {
    return null;
  }
}

function safeIdentifier(value: string): string {
  const normalized = value.replace(/[^a-zA-Z0-9_$]/g, "");
  return normalized.length > 0 && /^[a-zA-Z_$]/.test(normalized) ? normalized : "ClipboardData";
}

function renderType(value: unknown, depth: number): string {
  if (depth > 5) return "unknown";
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    const types = [...new Set(value.slice(0, 12).map((item) => renderType(item, depth + 1)))];
    return `(${types.join(" | ")})[]`;
  }
  switch (typeof value) {
    case "string": return "string";
    case "number": return "number";
    case "boolean": return "boolean";
    case "object": {
      const fields = Object.entries(value as Record<string, unknown>);
      if (fields.length === 0) return "Record<string, never>";
      return `{\n${fields.map(([key, item]) => `${"  ".repeat(depth + 1)}${JSON.stringify(key)}: ${renderType(item, depth + 1)};`).join("\n")}\n${"  ".repeat(depth)}}`;
    }
    default: return "unknown";
  }
}
