export interface WorkspaceMessageLike {
  role: "user" | "assistant" | "system";
  content: string;
  pinned: boolean;
}

export interface WorkspaceSnapshot {
  summary: string;
  decisions: string[];
  taskCandidates: string[];
}

const DECISION =
  /(?:^|\n)\s*(?:[-*]\s*)?(?:decidimos|decisão|we decided|decision|vamos usar|we'll use|usamos)[^\n]{6,180}/gi;
const TASK =
  /(?:^|\n)\s*(?:[-*]\s*)?(?:(?:- \[[ xX]\])|TODO:|tarefa:|task:)[^\n]{4,160}/gi;

function clip(text: string, max: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1)}…`;
}

export function buildWorkspaceSnapshot(messages: WorkspaceMessageLike[]): WorkspaceSnapshot {
  const visible = messages.filter((item) => item.role !== "system" && item.content.trim().length > 0);
  const firstUser = visible.find((item) => item.role === "user");
  const lastAssistant = [...visible].reverse().find((item) => item.role === "assistant");
  const pins = visible.filter((item) => item.pinned).slice(0, 3);
  const parts: string[] = [];
  if (firstUser) {
    parts.push(`User: ${clip(firstUser.content, 220)}`);
  }
  if (lastAssistant) {
    parts.push(`Assistant: ${clip(lastAssistant.content, 220)}`);
  }
  for (const pin of pins) {
    parts.push(`Pinned ${pin.role}: ${clip(pin.content, 160)}`);
  }
  const hay = visible.map((item) => item.content).join("\n");
  const decisions = uniqueClips(hay.matchAll(DECISION), 8);
  const taskCandidates = uniqueClips(hay.matchAll(TASK), 8).map((item) =>
    item.replace(/^(?:[-*]\s*)?(?:TODO:|tarefa:|task:|- \[[ xX]\])\s*/i, "").trim(),
  );
  return {
    summary: parts.join("\n") || "",
    decisions,
    taskCandidates: taskCandidates.filter((item) => item.length > 0),
  };
}

function uniqueClips(matches: IterableIterator<RegExpMatchArray>, max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of matches) {
    const raw = clip(match[0] ?? "", 180);
    const key = raw.toLowerCase();
    if (raw.length < 8 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(raw);
    if (out.length >= max) {
      break;
    }
  }
  return out;
}
