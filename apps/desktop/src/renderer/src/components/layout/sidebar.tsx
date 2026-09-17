import { type JSX, type ReactNode, useState, type RefObject } from "react";
import { Home, Inbox, Plus, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProjectDto, SearchHit } from "@ai-hub/shared";
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
  projectInputRef,
  searchQuery,
  searchHits,
  onSearchQuery,
  onOpenSearchHit,
  searchInputRef,
}: {
  view: AppView;
  onChange: (view: AppView) => void;
  projects: ProjectDto[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onCreateProject: (name: string) => Promise<void>;
  projectInputRef: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  searchHits: SearchHit[];
  onSearchQuery: (value: string) => void;
  onOpenSearchHit: (hit: SearchHit) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
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
            testId="nav-home"
          />
          <NavButton
            active={view === "settings"}
            icon={<Settings className="h-3.5 w-3.5" />}
            label={t("nav.settings")}
            onClick={() => onChange("settings")}
            testId="nav-settings"
          />
        </nav>
        <div className="mt-3 px-1">
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(event) => onSearchQuery(event.target.value)}
            placeholder={t("workspace.search")}
            aria-label={t("workspace.search")}
            data-testid="workspace-search"
          />
          {searchQuery.trim().length >= 2 ? (
            <ul className="mt-1 flex flex-col gap-0.5">
              {searchHits.length === 0 ? (
                <li className="px-1 py-1 text-[11px] text-muted-foreground">{t("workspace.searchEmpty")}</li>
              ) : (
                searchHits.map((hit) => (
                  <li key={`${hit.conversationId}:${hit.messageId ?? "title"}`}>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto w-full justify-start whitespace-normal py-1 text-left text-[11px]"
                      data-testid="search-hit"
                      onClick={() => onOpenSearchHit(hit)}
                    >
                      <span className="font-medium">{hit.conversationTitle}</span>
                      <span className="mt-0.5 block text-muted-foreground">{hit.snippet}</span>
                    </Button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
        <p className="mt-4 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("workspace.projects")}
        </p>
        <div className="mt-1 flex flex-col gap-0.5">
          <Button
            type="button"
            variant={view === "home" && selectedProjectId === null ? "secondary" : "ghost"}
            className="h-8 w-full justify-start gap-2 truncate"
            data-testid="inbox-avulsas"
            onClick={() => {
              onSelectProject(null);
              onChange("home");
            }}
          >
            <Inbox className="h-3.5 w-3.5 shrink-0" />
            {t("workspace.inbox")}
          </Button>
          {projects.length === 0 ? (
            <p className="px-2 py-1 text-[11px] text-muted-foreground">{t("empty.body")}</p>
          ) : null}
          {projects.map((project) => (
            <Button
              key={project.id}
              type="button"
              variant={selectedProjectId === project.id ? "secondary" : "ghost"}
              className="h-8 w-full justify-start gap-2 truncate"
              data-testid="project-item"
              onClick={() => {
                onSelectProject(project.id);
                onChange("home");
              }}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border"
                style={{ backgroundColor: project.color ?? "#64748b" }}
                aria-hidden
              />
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
          ref={projectInputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("workspace.projectPlaceholder")}
          aria-label={t("workspace.projectPlaceholder")}
          data-testid="workspace-new-project-name"
        />
        <Button type="submit" size="sm" className="h-7 gap-1" data-testid="workspace-new-project">
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
  testId,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  testId?: string;
}): JSX.Element {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      className="h-8 w-full justify-start gap-2"
      onClick={onClick}
      data-testid={testId}
    >
      {icon}
      {label}
    </Button>
  );
}
