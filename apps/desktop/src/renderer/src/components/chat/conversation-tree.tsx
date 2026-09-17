import { type JSX, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { childrenOf, type BranchLabels, type MessageDto } from "@ai-hub/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

function preview(content: string, fallback: string): string {
  const compact = content.replace(/\s+/g, " ").trim();
  if (compact.length === 0) {
    return fallback;
  }
  return compact.length <= 42 ? compact : `${compact.slice(0, 42)}…`;
}

function TreeBranch({
  messages,
  parentId,
  activeIds,
  labels,
  busy,
  onJump,
}: {
  messages: MessageDto[];
  parentId: string | null;
  activeIds: Set<string>;
  labels: BranchLabels;
  busy: boolean;
  onJump: (id: string) => void;
}): JSX.Element | null {
  const { t } = useTranslation();
  const nodes = childrenOf(messages, parentId);
  if (nodes.length === 0) {
    return null;
  }
  return (
    <ul className="flex flex-col gap-0.5 border-l border-border/80 pl-2">
      {nodes.map((node) => {
        const forks = childrenOf(messages, node.id).length;
        const current = activeIds.has(node.id);
        const name = labels[node.branchId];
        return (
          <li key={node.id}>
            <Button
              type="button"
              variant={current ? "secondary" : "ghost"}
              size="sm"
              className="h-auto w-full justify-start whitespace-normal py-1 text-left font-normal"
              data-testid="tree-node"
              aria-current={current ? "true" : undefined}
              disabled={busy}
              onClick={() => onJump(node.id)}
            >
              <span className="min-w-0 flex-1 truncate">
                {name ? `${name} · ` : ""}
                {preview(node.content, t("workspace.placeholder"))}
              </span>
              {forks > 1 ? (
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {t("workspace.tree.forks", { count: forks })}
                </span>
              ) : null}
            </Button>
            <TreeBranch
              messages={messages}
              parentId={node.id}
              activeIds={activeIds}
              labels={labels}
              busy={busy}
              onJump={onJump}
            />
          </li>
        );
      })}
    </ul>
  );
}

export function ConversationTree({
  messages,
  activeIds,
  labels,
  activeBranchId,
  busy,
  onJump,
  onRename,
}: {
  messages: MessageDto[];
  activeIds: Set<string>;
  labels: BranchLabels;
  activeBranchId: string | null;
  busy: boolean;
  onJump: (id: string) => void;
  onRename: (branchId: string, label: string) => Promise<void>;
}): JSX.Element {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(activeBranchId ? (labels[activeBranchId] ?? "") : "");

  useEffect(() => {
    setDraft(activeBranchId ? (labels[activeBranchId] ?? "") : "");
  }, [activeBranchId, labels]);

  return (
    <aside className="flex w-56 shrink-0 flex-col border-l" data-testid="conversation-tree">
      <div className="border-b px-3 py-2">
        <h2 className="text-sm font-semibold">{t("workspace.tree.title")}</h2>
        <p className="text-[11px] text-muted-foreground">{t("workspace.tree.hint")}</p>
      </div>
      <ScrollArea className="flex-1 p-2">
        {messages.length === 0 ? (
          <p className="px-1 text-muted-foreground">{t("workspace.tree.empty")}</p>
        ) : (
          <TreeBranch
            messages={messages}
            parentId={null}
            activeIds={activeIds}
            labels={labels}
            busy={busy}
            onJump={onJump}
          />
        )}
      </ScrollArea>
      {activeBranchId ? (
        <form
          className="flex flex-col gap-1 border-t p-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onRename(activeBranchId, draft.trim());
          }}
        >
          <label className="text-[11px] text-muted-foreground" htmlFor="branch-name">
            {t("workspace.tree.rename")}
          </label>
          <Input
            id="branch-name"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={80}
            disabled={busy}
            aria-label={t("workspace.tree.rename")}
          />
          <Button type="submit" size="sm" disabled={busy}>
            {t("workspace.tree.saveName")}
          </Button>
        </form>
      ) : null}
    </aside>
  );
}
