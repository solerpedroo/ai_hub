export interface MessageGraphNode {
  id: string;
  parentId: string | null;
  isActiveBranch: boolean;
  createdAt: string;
}

export function compareGraphNodes(a: MessageGraphNode, b: MessageGraphNode): number {
  const byTime = a.createdAt.localeCompare(b.createdAt);
  if (byTime !== 0) {
    return byTime;
  }
  return a.id.localeCompare(b.id);
}

export function childrenOf<T extends MessageGraphNode>(
  messages: readonly T[],
  parentId: string | null,
): T[] {
  return messages
    .filter((item) => item.parentId === parentId)
    .slice()
    .sort(compareGraphNodes);
}

export function siblingsOf<T extends MessageGraphNode>(messages: readonly T[], messageId: string): T[] {
  const target = messages.find((item) => item.id === messageId);
  if (!target) {
    return [];
  }
  return childrenOf(messages, target.parentId);
}

export function ancestorsOf<T extends MessageGraphNode>(messages: readonly T[], messageId: string): T[] {
  const byId = new Map(messages.map((item) => [item.id, item]));
  const chain: T[] = [];
  const seen = new Set<string>();
  let current = byId.get(messageId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.push(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

export function activePath<T extends MessageGraphNode>(messages: readonly T[]): T[] {
  const path: T[] = [];
  const seen = new Set<string>();
  let parentId: string | null = null;
  for (;;) {
    const children: T[] = childrenOf(messages, parentId);
    if (children.length === 0) {
      return path;
    }
    const active = children.find((item: T) => item.isActiveBranch);
    const next: T | undefined = active ?? children[0];
    if (!next || seen.has(next.id)) {
      return path;
    }
    seen.add(next.id);
    path.push(next);
    parentId = next.id;
  }
}

export function upsertActivated<T extends MessageGraphNode>(messages: readonly T[], activated: T): T[] {
  const exists = messages.some((item) => item.id === activated.id);
  const merged = exists
    ? messages.map((item) => (item.id === activated.id ? activated : item))
    : [...messages, activated];
  return merged.map((item) => {
    if (item.id === activated.id) {
      return { ...item, isActiveBranch: true };
    }
    if (item.parentId === activated.parentId) {
      return { ...item, isActiveBranch: false };
    }
    return item;
  });
}

export function selectExportMessages<T extends MessageGraphNode>(
  mode: "active" | "tree",
  messages: readonly T[],
): T[] {
  if (mode === "active") {
    return activePath(messages);
  }
  return messages.slice().sort(compareGraphNodes);
}
