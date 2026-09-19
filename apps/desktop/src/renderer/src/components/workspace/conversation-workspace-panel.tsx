import { type JSX, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ConversationWorkspaceDto } from "@ai-hub/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ConversationWorkspacePanel({
  workspace,
  busy,
  onRefresh,
  onAddTask,
  onSetTaskDone,
  onRemoveTask,
}: {
  workspace: ConversationWorkspaceDto | null;
  busy: boolean;
  onRefresh: () => Promise<void>;
  onAddTask: (title: string) => Promise<void>;
  onSetTaskDone: (id: string, done: boolean) => Promise<void>;
  onRemoveTask: (id: string) => Promise<void>;
}): JSX.Element {
  const { t } = useTranslation();
  const [taskTitle, setTaskTitle] = useState("");

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l" data-testid="workspace-panel">
      <div className="flex items-center justify-between border-b px-2 py-1.5">
        <p className="text-[12px] font-medium">{t("workspace.panel.title")}</p>
        <Button type="button" size="sm" variant="ghost" data-testid="workspace-refresh" disabled={busy} onClick={() => void onRefresh()}>
          {t("workspace.panel.refresh")}
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2">
        <section>
          <p className="text-[11px] font-medium">{t("workspace.panel.summary")}</p>
          <p className="text-[12px] text-muted-foreground" data-testid="workspace-summary">
            {workspace?.summary || t("workspace.panel.empty")}
          </p>
        </section>
        <section>
          <p className="text-[11px] font-medium">{t("workspace.panel.decisions")}</p>
          <ul data-testid="workspace-decisions">
            {(workspace?.decisions ?? []).length === 0 ? (
              <li className="text-[12px] text-muted-foreground">{t("workspace.panel.empty")}</li>
            ) : (
              workspace?.decisions.map((item) => (
                <li key={item} className="text-[12px]">
                  {item}
                </li>
              ))
            )}
          </ul>
        </section>
        <section>
          <p className="text-[11px] font-medium">{t("workspace.panel.pins")}</p>
          <p className="text-[12px] text-muted-foreground" data-testid="workspace-pins">
            {t("workspace.panel.pinCount", { n: workspace?.pins.length ?? 0 })}
          </p>
        </section>
        <section>
          <p className="text-[11px] font-medium">{t("workspace.panel.tasks")}</p>
          <div className="mb-1 flex gap-1">
            <Input
              data-testid="workspace-task-title"
              value={taskTitle}
              placeholder={t("workspace.panel.taskPlaceholder")}
              onChange={(event) => setTaskTitle(event.target.value)}
            />
            <Button
              type="button"
              size="sm"
              data-testid="workspace-task-add"
              disabled={taskTitle.trim().length === 0}
              onClick={() => {
                void onAddTask(taskTitle.trim()).then(() => setTaskTitle(""));
              }}
            >
              {t("workspace.panel.add")}
            </Button>
          </div>
          <ul>
            {(workspace?.tasks ?? []).map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-1" data-testid="workspace-task">
                <label className="flex min-w-0 items-center gap-1 text-[12px]">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={(event) => {
                      void onSetTaskDone(task.id, event.target.checked);
                    }}
                  />
                  <span className={task.done ? "text-muted-foreground line-through" : ""}>{task.title}</span>
                </label>
                <Button type="button" size="sm" variant="ghost" onClick={() => void onRemoveTask(task.id)}>
                  {t("workspace.panel.remove")}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
