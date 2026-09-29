import { type JSX, type ReactNode, useState, type RefObject } from "react";
import { Activity, Home, Inbox, Library, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, Upload, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProjectDto, SearchHit } from "@ai-hub/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AppView } from "./types";

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  view,
  onChange,
  projects,
  selectedProjectId,
  importedInbox,
  onSelectProject,
  onSelectImportedInbox,
  onCreateProject,
  projectInputRef,
  searchQuery,
  searchHits,
  onSearchQuery,
  onOpenSearchHit,
  searchInputRef,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  view: AppView;
  onChange: (view: AppView) => void;
  projects: ProjectDto[];
  selectedProjectId: string | null;
  importedInbox: boolean;
  onSelectProject: (id: string | null) => void;
  onSelectImportedInbox: () => void;
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
    <aside className={`app-sidebar flex shrink-0 flex-col border-r text-sidebar-foreground transition-[width] duration-200 ${collapsed ? "w-12" : "w-52"}`}>
      <div className="flex h-10 items-center justify-end px-2"><Button type="button" size="icon" variant="ghost" className="shadow-none" onClick={onToggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</Button></div>
      {collapsed ? (
        <nav className="flex flex-col gap-1 px-2">
          <NavButton active={view === "home"} icon={<Home className="h-4 w-4" />} label="" onClick={() => onChange("home")} />
          <NavButton active={view === "prompts"} icon={<Library className="h-4 w-4" />} label="" onClick={() => onChange("prompts")} />
          <NavButton active={view === "skills"} icon={<Workflow className="h-4 w-4" />} label="" onClick={() => onChange("skills")} />
          <NavButton active={view === "settings"} icon={<Settings className="h-4 w-4" />} label="" onClick={() => onChange("settings")} />
        </nav>
      ) : <>
      <ScrollArea className="scrollbar-subtle flex-1 p-2.5">
        <div className="mb-3 px-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Workspace</div>
        <nav className="flex flex-col gap-0.5">
          <NavButton
            active={view === "home"}
            icon={<Home className="h-3.5 w-3.5" />}
            label={t("nav.home")}
            onClick={() => onChange("home")}
            testId="nav-home"
          />
          <NavButton
            active={view === "prompts"}
            icon={<Library className="h-3.5 w-3.5" />}
            label={t("nav.prompts")}
            onClick={() => onChange("prompts")}
            testId="nav-prompts"
          />
          <NavButton
            active={view === "skills"}
            icon={<Workflow className="h-3.5 w-3.5" />}
            label={t("nav.skills")}
            onClick={() => onChange("skills")}
            testId="nav-skills"
          />
          <NavButton
            active={view === "settings"}
            icon={<Settings className="h-3.5 w-3.5" />}
            label={t("nav.settings")}
            onClick={() => onChange("settings")}
            testId="nav-settings"
          />
          <NavButton
            active={view === "debug"}
            icon={<Activity className="h-3.5 w-3.5" />}
            label={t("nav.debug")}
            onClick={() => onChange("debug")}
            testId="nav-debug"
          />
          <NavButton
            active={view === "import"}
            icon={<Upload className="h-3.5 w-3.5" />}
            label={t("nav.import")}
            onClick={() => onChange("import")}
            testId="nav-import"
          />
        </nav>
        <div className="relative mt-4 px-1">
          <Search className="pointer-events-none absolute left-3 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-8 bg-background/70 pl-7 text-[12px] shadow-sm"
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
                <li className="px-1 py-1 text-[11px] text-muted-foreground">
                  {t("workspace.searchEmpty")}
                </li>
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
                      <span className="mt-0.5 block text-muted-foreground">
                        {hit.snippet}
                      </span>
                    </Button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
        <p className="mt-5 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {t("workspace.projects")}
        </p>
        <div className="mt-1 flex flex-col gap-0.5">
          <Button
            type="button"
            variant={
              view === "home" && selectedProjectId === null && !importedInbox
                ? "secondary"
                : "ghost"
            }
            className="nav-rail h-8 w-full justify-start gap-2 truncate shadow-none"
            data-testid="inbox-avulsas"
            aria-current={
              view === "home" && selectedProjectId === null && !importedInbox
                ? "page"
                : undefined
            }
            onClick={() => {
              onSelectProject(null);
              onChange("home");
            }}
          >
            <Inbox className="h-3.5 w-3.5 shrink-0" />
            {t("workspace.inbox")}
          </Button>
          <Button
            type="button"
            variant={
              view === "home" && selectedProjectId === null && importedInbox
                ? "secondary"
                : "ghost"
            }
            className="h-8 w-full justify-start gap-2 truncate"
            data-testid="inbox-imported"
            aria-current={
              view === "home" && selectedProjectId === null && importedInbox
                ? "page"
                : undefined
            }
            onClick={() => {
              onSelectImportedInbox();
              onChange("home");
            }}
          >
            <Upload className="h-3.5 w-3.5 shrink-0" />
            {t("workspace.importedInbox")}
          </Button>
          {projects.length === 0 ? (
            <p className="px-2 py-1 text-[11px] text-muted-foreground">
              {t("empty.body")}
            </p>
          ) : null}
          {projects.map((project) => (
            <Button
              key={project.id}
              type="button"
              variant={selectedProjectId === project.id ? "secondary" : "ghost"}
              className="nav-rail h-8 w-full justify-start gap-2 truncate shadow-none"
              data-testid="project-item"
              aria-current={
                view === "home" && selectedProjectId === project.id ? "page" : undefined
              }
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
        className="flex flex-col gap-1.5 border-t bg-background/35 p-2.5"
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
        <Button
          type="submit"
          size="sm"
          className="h-8 gap-1"
          data-testid="workspace-new-project"
        >
          <Plus className="h-3 w-3" />
          {t("workspace.newProject")}
        </Button>
      </form></>}
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
      className="nav-rail h-8 w-full justify-start gap-2 shadow-none"
      onClick={onClick}
      data-testid={testId}
    >
      {icon}
      {label}
    </Button>
  );
}
