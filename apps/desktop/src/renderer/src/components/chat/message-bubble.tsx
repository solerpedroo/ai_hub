import { type JSX, useState } from "react";
import { useTranslation } from "react-i18next";
import { siblingsOf, type MessageDto } from "@ai-hub/shared";
import { Button } from "@/components/ui/button";
import { CopyResponseButton, MessageMarkdown } from "@/components/chat/message-markdown";

export function MessageBubble({
  message,
  messages,
  isLast,
  busy,
  hasKey,
  onRegenerate,
  onContinue,
  onEdit,
  onEditingChange,
  onActivateSibling,
}: {
  message: MessageDto;
  messages: MessageDto[];
  isLast: boolean;
  busy: boolean;
  hasKey: boolean;
  onRegenerate: () => void;
  onContinue: () => void;
  onEdit: (content: string) => Promise<void>;
  onEditingChange?: (editing: boolean) => void;
  onActivateSibling: (id: string) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const statusLabel =
    message.status === "complete" ? null : t(`workspace.status.${message.status}`);
  const canContinue =
    isLast &&
    hasKey &&
    message.role === "assistant" &&
    (message.status === "interrupted" || message.status === "aborted");
  const canRegenerate =
    hasKey && message.role === "assistant" && message.status !== "streaming" && !busy;
  const canEdit = hasKey && message.role === "user" && message.status === "complete" && !busy;
  const siblings = siblingsOf(messages, message.id);
  const siblingIndex = siblings.findIndex((item) => item.id === message.id);
  const showSiblings = siblings.length > 1 && siblingIndex >= 0;

  return (
    <li
      className="rounded-md border bg-card p-2"
      data-testid={message.role === "assistant" ? "message-assistant" : "message-user"}
      data-status={message.status}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase text-muted-foreground">
          {t(`workspace.role.${message.role}`)}
          {statusLabel ? ` · ${statusLabel}` : ""}
        </p>
        <div className="flex items-center gap-1">
          {showSiblings ? (
            <div className="flex items-center gap-0.5" data-testid="sibling-nav">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy || siblingIndex <= 0}
                aria-label={t("workspace.sibling.prev")}
                onClick={() => {
                  const previous = siblings[siblingIndex - 1];
                  if (previous) {
                    onActivateSibling(previous.id);
                  }
                }}
              >
                ←
              </Button>
              <span className="px-1 text-[11px] text-muted-foreground" data-testid="sibling-count">
                {t("workspace.sibling.count", {
                  current: siblingIndex + 1,
                  total: siblings.length,
                })}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy || siblingIndex >= siblings.length - 1}
                aria-label={t("workspace.sibling.next")}
                onClick={() => {
                  const next = siblings[siblingIndex + 1];
                  if (next) {
                    onActivateSibling(next.id);
                  }
                }}
              >
                →
              </Button>
            </div>
          ) : null}
          {message.role === "assistant" && message.content.length > 0 ? (
            <CopyResponseButton text={message.content} />
          ) : null}
        </div>
      </div>
      {editing ? (
        <form
          className="flex flex-col gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            const next = draft.trim();
            if (!next) {
              return;
            }
            void onEdit(next).then(() => {
              setEditing(false);
              onEditingChange?.(false);
            });
          }}
        >
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            className="w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("workspace.edit")}
          />
          <div className="flex gap-1">
            <Button type="submit" size="sm">
              {t("workspace.saveEdit")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setDraft(message.content);
                setEditing(false);
                onEditingChange?.(false);
              }}
            >
              {t("workspace.cancelEdit")}
            </Button>
          </div>
        </form>
      ) : message.role === "assistant" ? (
        <MessageMarkdown content={message.content.length > 0 ? message.content : t("workspace.placeholder")} />
      ) : (
        <p className="whitespace-pre-wrap">{message.content}</p>
      )}
      {message.receipt ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t("workspace.receipt", {
            model: message.receipt.model ?? "—",
            tokensIn: message.receipt.tokensIn ?? "—",
            tokensOut: message.receipt.tokensOut ?? "—",
            cost: message.receipt.costUsd ?? "—",
            latency: message.receipt.latencyMs ?? "—",
          })}
          {message.receipt.errorCode
            ? ` · ${t("workspace.receipt.error", { code: message.receipt.errorCode })}`
            : ""}
        </p>
      ) : null}
      {canEdit || canRegenerate || canContinue ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setDraft(message.content);
                setEditing(true);
                onEditingChange?.(true);
              }}
            >
              {t("workspace.edit")}
            </Button>
          ) : null}
          {canRegenerate ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="message-regenerate"
              onClick={onRegenerate}
              disabled={busy}
            >
              {t("workspace.regenerate")}
            </Button>
          ) : null}
          {canContinue ? (
            <Button type="button" size="sm" variant="outline" onClick={onContinue} disabled={busy}>
              {t("workspace.continue")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
