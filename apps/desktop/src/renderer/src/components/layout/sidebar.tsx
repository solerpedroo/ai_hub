import { type JSX, type ReactNode, useState } from "react";
import { Home, Plus, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProjectDto } from "@ai-hub/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AppView } from "./types";

export function Sidebar({
  view,
  onChange,
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
}: {
  view: AppView;
  onChange: (view: AppView) => void;
  projects: ProjectDto[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string) => Promise<void>;
}): JSX.Element {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  const submit = (): void => {
    const name = draft.trim();
    if (!name) {
      return;
    }
    void onCreateProject(name).then(() => setDraft(""));
  };

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <ScrollArea className="flex-1 p-2">
        <nav className="flex flex-col gap-0.5">
          <NavButton
            active={view === "home"}
            icon={<Home className="h-3.5 w-3.5" />}
            label={t("nav.home")}
            onClick={() => onChange("home")}
          />
          <NavButton
            active={view === "settings"}
            icon={<Settings className="h-3.5 w-3.5" />}
            label={t("nav.settings")}
            onClick={() => onChange("settings")}
          />
        </nav>
        <p className="mt-4 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("workspace.projects")}
        </p>
        <div className="mt-1 flex flex-col gap-0.5">
          {projects.map((project) => (
            <Button
              key={project.id}
              type="button"
              variant={selectedProjectId === project.id ? "secondary" : "ghost"}
              className="h-8 w-full justify-start truncate"
              onClick={() => {
                onSelectProject(project.id);
                onChange("home");
              }}
            >
              {project.name}
            </Button>
          ))}
        </div>
      </ScrollArea>
      <form
        className="flex flex-col gap-1 border-t p-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("workspace.projectPlaceholder")}
          aria-label={t("workspace.projectPlaceholder")}
        />
        <Button type="submit" size="sm" className="h-7 gap-1">
          <Plus className="h-3 w-3" />
          {t("workspace.newProject")}
        </Button>
      </form>
    </aside>
  );
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      className="h-8 w-full justify-start gap-2"
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}
