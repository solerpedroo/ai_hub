import { type JSX, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ProjectMemoryDto } from "@ai-hub/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MemoryPanel({
  memories,
  optedOut,
  suggestions,
  canEdit,
  onCreate,
  onUpdate,
  onRemove,
  onSetOptOut,
  onSaveSuggestion,
  onDismissSuggestions,
}: {
  memories: ProjectMemoryDto[];
  optedOut: boolean;
  suggestions: string[];
  canEdit: boolean;
  onCreate: (title: string, body: string) => Promise<void>;
  onUpdate: (id: string, title: string, body: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onSetOptOut: (optedOut: boolean) => Promise<void>;
  onSaveSuggestion: (body: string) => Promise<void>;
  onDismissSuggestions: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l" data-testid="memory-panel">
      <div className="flex items-center justify-between border-b px-2 py-1.5">
        <p className="text-[12px] font-medium">{t("memory.title")}</p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          data-testid="memory-opt-out"
          disabled={!canEdit}
          onClick={() => {
            void onSetOptOut(!optedOut);
          }}
        >
          {optedOut ? t("memory.optIn") : t("memory.optOut")}
        </Button>
      </div>
      {suggestions.length > 0 ? (
        <div className="border-b px-2 py-2" data-testid="memory-suggest">
          <p className="mb-1 text-[11px] text-muted-foreground">{t("memory.suggest")}</p>
          {suggestions.map((item) => (
            <div key={item} className="mb-1 flex items-start justify-between gap-1">
              <p className="text-[12px]">{item}</p>
              <Button
                type="button"
                size="sm"
                data-testid="memory-suggest-save"
                onClick={() => {
                  void onSaveSuggestion(item);
                }}
              >
                {t("memory.save")}
              </Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="ghost" onClick={onDismissSuggestions}>
            {t("memory.ignore")}
          </Button>
        </div>
      ) : null}
      <div className="flex flex-col gap-1 border-b px-2 py-2">
        <Input
          data-testid="memory-title"
          value={title}
          disabled={!canEdit}
          placeholder={t("memory.titlePlaceholder")}
          onChange={(event) => setTitle(event.target.value)}
        />
        <textarea
          data-testid="memory-body"
          className="min-h-[4rem] resize-none rounded-md border bg-background px-2 py-1 text-[12px]"
          value={body}
          disabled={!canEdit}
          placeholder={t("memory.bodyPlaceholder")}
          onChange={(event) => setBody(event.target.value)}
        />
        <Button
          type="button"
          size="sm"
          data-testid="memory-save"
          disabled={!canEdit || body.trim().length === 0}
          onClick={() => {
            const nextTitle = title.trim() || body.trim().slice(0, 80);
            const nextBody = body.trim();
            if (editId) {
              void onUpdate(editId, nextTitle, nextBody).then(() => {
                setEditId(null);
                setTitle("");
                setBody("");
              });
              return;
            }
            void onCreate(nextTitle, nextBody).then(() => {
              setTitle("");
              setBody("");
            });
          }}
        >
          {editId ? t("memory.update") : t("memory.add")}
        </Button>
      </div>
      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto p-2">
        {memories.length === 0 ? (
          <li className="text-[12px] text-muted-foreground">{t("memory.empty")}</li>
        ) : (
          memories.map((item) => (
            <li key={item.id} className="rounded-md border px-2 py-1" data-testid="memory-item">
              <p className="text-[12px] font-medium">{item.title}</p>
              <p className="text-[12px] text-muted-foreground">{item.body}</p>
              <div className="mt-1 flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditId(item.id);
                    setTitle(item.title);
                    setBody(item.body);
                  }}
                >
                  {t("memory.edit")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  data-testid="memory-delete"
                  onClick={() => {
                    void onRemove(item.id);
                  }}
                >
                  {t("memory.delete")}
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
