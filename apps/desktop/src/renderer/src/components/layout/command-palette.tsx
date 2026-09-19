import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import {
  catalogModelsForProvider,
  type ProjectDto,
  type ProviderKeyDto,
  type SearchHit,
  type ThemeMode,
} from "@ai-hub/shared";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/lib/theme";

export interface PaletteModelOption {
  keyId: string;
  keyLabel: string;
  modelId: string;
  providerSlug: string;
  label: string;
}

interface PaletteAction {
  id: string;
  label: string;
  keywords: string;
  disabled?: boolean;
  run: () => void;
}

function matchesQuery(value: string, query: string): boolean {
  return value.toLocaleLowerCase().includes(query.toLocaleLowerCase());
}

export function ChromeCommandPalette({
  projects,
  providerKeys,
  selectedModel,
  selectedConversationId,
  busy,
  onNewProject,
  onNewChat,
  onOpenInbox,
  onOpenImportedInbox,
  onOpenProject,
  onOpenSearchHit,
  onSearchWorkspace,
  onSelectModel,
  onExport,
  onProviders,
  onSettings,
  onDebug,
  onImport,
  onPrompts,
  onShortcuts,
}: {
  projects: ProjectDto[];
  providerKeys: ProviderKeyDto[];
  selectedModel: string;
  selectedConversationId: string | null;
  busy: boolean;
  onNewProject: () => void;
  onNewChat: () => void;
  onOpenInbox: () => void;
  onOpenImportedInbox: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenSearchHit: (hit: SearchHit) => void;
  onSearchWorkspace: (query: string) => Promise<SearchHit[]>;
  onSelectModel: (option: PaletteModelOption) => void;
  onExport: (mode: "active" | "tree") => void;
  onProviders: () => void;
  onSettings: () => void;
  onDebug: () => void;
  onImport: () => void;
  onPrompts: () => void;
  onShortcuts: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const searchGeneration = useRef(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    const generation = searchGeneration.current + 1;
    searchGeneration.current = generation;
    if (!open || trimmed.length < 2) {
      setSearchHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = window.setTimeout(() => {
      void onSearchWorkspace(trimmed)
        .then((hits) => {
          if (searchGeneration.current === generation) {
            setSearchHits(hits);
          }
        })
        .catch(() => {
          if (searchGeneration.current === generation) {
            setSearchHits([]);
          }
        })
        .finally(() => {
          if (searchGeneration.current === generation) {
            setSearching(false);
          }
        });
    }, 150);
    return () => window.clearTimeout(handle);
  }, [onSearchWorkspace, open, query]);

  const closeAndRun = (action: () => void): void => {
    setOpen(false);
    setQuery("");
    setSearchHits([]);
    action();
  };

  const actions: PaletteAction[] = [
    {
      id: "new-chat",
      label: t("command.newChat"),
      keywords: "new chat conversation nova conversa",
      run: onNewChat,
    },
    {
      id: "new-project",
      label: t("command.newProject"),
      keywords: "new create project novo criar projeto",
      run: onNewProject,
    },
    {
      id: "inbox",
      label: t("command.inbox"),
      keywords: "inbox avulsas unfiled",
      run: onOpenInbox,
    },
    {
      id: "import",
      label: t("command.import"),
      keywords: "import chatgpt claude gemini importar",
      run: onImport,
    },
    {
      id: "prompts",
      label: t("command.prompts"),
      keywords: "prompt library playground prompts biblioteca",
      run: onPrompts,
    },
    {
      id: "imported",
      label: t("command.importedInbox"),
      keywords: "imported importadas",
      run: onOpenImportedInbox,
    },
    {
      id: "export-active",
      label: t("command.exportActive"),
      keywords: "export active branch conversation exportar conversa ramo ativo",
      disabled: selectedConversationId === null || busy,
      run: () => onExport("active"),
    },
    {
      id: "export-tree",
      label: t("command.exportTree"),
      keywords: "export tree json exportar arvore árvore",
      disabled: selectedConversationId === null || busy,
      run: () => onExport("tree"),
    },
    {
      id: "providers",
      label: t("command.providers"),
      keywords: "providers api keys provedores chaves",
      run: onProviders,
    },
    {
      id: "settings",
      label: t("command.settings"),
      keywords: "settings preferences configurações configuracoes preferencias",
      run: onSettings,
    },
    {
      id: "shortcuts",
      label: t("command.shortcuts"),
      keywords: "keyboard shortcuts help atalhos teclado ajuda",
      run: onShortcuts,
    },
    {
      id: "debug",
      label: t("command.debug"),
      keywords: "debug observability observabilidade",
      run: onDebug,
    },
    {
      id: "theme-light",
      label: `${t("command.theme")}: ${t("theme.light")}`,
      keywords: "theme light tema claro",
      run: () => setTheme("light" satisfies ThemeMode),
    },
    {
      id: "theme-dark",
      label: `${t("command.theme")}: ${t("theme.dark")}`,
      keywords: "theme dark tema escuro",
      run: () => setTheme("dark" satisfies ThemeMode),
    },
    {
      id: "theme-system",
      label: `${t("command.theme")}: ${t("theme.system")}`,
      keywords: "theme system tema sistema",
      run: () => setTheme("system" satisfies ThemeMode),
    },
  ];

  const modelOptions = useMemo<PaletteModelOption[]>(
    () =>
      providerKeys.flatMap((key) => {
        const catalog = catalogModelsForProvider(key.providerSlug);
        if (catalog.length === 0 && key.providerSlug === "custom") {
          return [
            {
              keyId: key.id,
              keyLabel: key.label,
              modelId: selectedModel,
              providerSlug: key.providerSlug,
              label: selectedModel,
            },
          ];
        }
        return catalog.map((model) => ({
          keyId: key.id,
          keyLabel: key.label,
          modelId: model.id,
          providerSlug: key.providerSlug,
          label: model.label,
        }));
      }),
    [providerKeys, selectedModel],
  );

  const normalizedQuery = query.trim();
  const visibleActions = actions.filter(
    (action) =>
      normalizedQuery.length === 0 ||
      matchesQuery(`${action.label} ${action.keywords}`, normalizedQuery),
  );
  const visibleProjects = projects.filter(
    (project) =>
      normalizedQuery.length === 0 || matchesQuery(project.name, normalizedQuery),
  );
  const visibleModels = modelOptions.filter(
    (option) =>
      normalizedQuery.length === 0 ||
      matchesQuery(
        `${option.label} ${option.modelId} ${option.providerSlug} ${option.keyLabel} model modelo`,
        normalizedQuery,
      ),
  );
  const resultCount =
    visibleActions.length +
    visibleProjects.length +
    visibleModels.length +
    searchHits.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setSearchHits([]);
        }
      }}
    >
      <DialogContent className="overflow-hidden p-0" data-testid="command-palette">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("command.placeholder")}</DialogTitle>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={t("command.placeholder")}
            data-testid="command-input"
          />
          <CommandList className="max-h-96">
            {resultCount === 0 && !searching ? (
              <CommandEmpty>{t("command.empty")}</CommandEmpty>
            ) : null}
            {visibleActions.length > 0 ? (
              <section aria-label={t("command.group.actions")}>
                <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("command.group.actions")}
                </p>
                {visibleActions.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={`action:${action.id}`}
                    disabled={action.disabled === true}
                    data-testid={`command-${action.id}`}
                    onSelect={() => closeAndRun(action.run)}
                  >
                    {action.label}
                    {action.disabled ? (
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {t("command.unavailable")}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </section>
            ) : null}
            {visibleProjects.length > 0 ? (
              <section aria-label={t("command.group.projects")}>
                <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("command.group.projects")}
                </p>
                {visibleProjects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={`project:${project.id}`}
                    data-testid="command-project"
                    onSelect={() => closeAndRun(() => onOpenProject(project.id))}
                  >
                    {project.name}
                  </CommandItem>
                ))}
              </section>
            ) : null}
            {visibleModels.length > 0 ? (
              <section aria-label={t("command.group.models")}>
                <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("command.group.models")}
                </p>
                {visibleModels.map((option) => (
                  <CommandItem
                    key={`${option.keyId}:${option.modelId}`}
                    value={`model:${option.keyId}:${option.modelId}`}
                    disabled={busy}
                    data-testid="command-model"
                    onSelect={() => closeAndRun(() => onSelectModel(option))}
                  >
                    <span>{option.label}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {option.providerSlug} · {option.keyLabel}
                    </span>
                  </CommandItem>
                ))}
              </section>
            ) : null}
            {searchHits.length > 0 ? (
              <section aria-label={t("command.group.conversations")}>
                <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("command.group.conversations")}
                </p>
                {searchHits.map((hit) => (
                  <CommandItem
                    key={`${hit.conversationId}:${hit.messageId ?? "title"}`}
                    value={`conversation:${hit.conversationId}:${hit.messageId ?? "title"}`}
                    data-testid="command-search-hit"
                    onSelect={() => closeAndRun(() => onOpenSearchHit(hit))}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {hit.conversationTitle}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {hit.snippet}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </section>
            ) : null}
            {searching ? (
              <p className="px-2 py-2 text-[11px] text-muted-foreground" role="status">
                {t("command.searching")}
              </p>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
