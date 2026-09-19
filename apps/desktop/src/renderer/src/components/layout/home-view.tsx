import { type JSX, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  activePath,
  catalogModelsForProvider,
  findCatalogModel,
  isMentionStubType,
  MAX_MENTION_TOKENS,
  mentionQueryParts,
  mentionVisibleContent,
  MENTION_TYPES,
  parseMentionTokens,
  type BranchLabels,
  type CatalogModel,
  type ContextPacketDto,
  type ConversationDto,
  type ConversationWorkspaceDto,
  type MentionRef,
  type MessageDto,
  type ProjectMemoryDto,
  type PacketPreviewResult,
  type PacketPrivacyMode,
  type ProjectDto,
  type ProjectUpdateInput,
  type ProjectFileDto,
  type PromptDto,
  type SkillDto,
  type ArtifactDto,
  type ProviderKeyDto,
} from "@ai-hub/shared";
import {
  ChatComposer,
  type MentionSuggestion,
  type SlashCommandId,
} from "@/components/chat/chat-composer";
import { ConversationTree } from "@/components/chat/conversation-tree";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ArtifactCanvas } from "@/components/chat/artifact-canvas";
import { PacketPanel } from "@/components/chat/packet-panel";
import { ConversationWorkspacePanel } from "@/components/workspace/conversation-workspace-panel";
import { MemoryPanel } from "@/components/workspace/memory-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const PROJECT_COLORS = [
  "#64748b",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#d97706",
  "#16a34a",
  "#0891b2",
] as const;

function mentionRefsFrom(chips: MentionSuggestion[], draft: string): MentionRef[] {
  const fromChips = chips.map((chip) =>
    chip.id ? { type: chip.type, id: chip.id } : { type: chip.type, query: chip.query || chip.label },
  );
  const fromText = parseMentionTokens(draft).mentions.map((item) => ({
    type: item.type,
    query: item.query,
  }));
  return [...fromChips, ...fromText]
    .filter((item) => ("id" in item && item.id.length > 0) || ("query" in item && item.query.length > 0))
    .slice(0, 8);
}

export function HomeView({
  project,
  importedInbox,
  projects,
  conversations,
  selectedConversationId,
  messages,
  error,
  providerKeys,
  selectedKeyId,
  selectedModel,
  temperature,
  maxTokens,
  extraSystem,
  streaming,
  sending,
  branchLabels,
  exportNotice,
  onSelectConversation,
  onCreateConversation,
  onSelectKey,
  onSelectModel,
  onSelectTemperature,
  onSelectMaxTokens,
  onSelectExtraSystem,
  onSend,
  onAbort,
  onRegenerate,
  onContinue,
  onEditUser,
  onActivate,
  onRenameBranch,
  onExport,
  onMoveConversation,
  onSaveProject,
  onRemoveProject,
  onSetTags,
  compactHistory,
  onToggleCompact,
  packetPreview,
  modelSwitchNotice,
  conversationCost,
  projectCost,
  showAllowOnce,
  onAllowOnce,
  onComposerDraft,
  onPin,
  packets,
  privacyMode,
  onPrivacyMode,
  onCompilePacket,
  onExportPacket,
  onImportPacket,
  onApplyPacket,
  onClearPacket,
  onOpenCaps,
  attachedFiles,
  onAttachFile,
  onAttachFolder,
  onRemoveFile,
  onDropFiles,
  onMentionsChange,
  onDuplicateConversation,
  onPromoteConversation,
  composerInsert,
  onComposerInsertConsumed,
  pendingSkill,
  onPendingSkillConsumed,
  onOpenSkills,
}: {
  project: ProjectDto | null;
  importedInbox: boolean;
  projects: ProjectDto[];
  conversations: ConversationDto[];
  selectedConversationId: string | null;
  messages: MessageDto[];
  error: string | null;
  providerKeys: ProviderKeyDto[];
  selectedKeyId: string | null;
  selectedModel: string;
  temperature: number;
  maxTokens: number | null;
  extraSystem: string;
  streaming: boolean;
  sending: boolean;
  branchLabels: BranchLabels;
  exportNotice: string | null;
  onSelectConversation: (id: string) => void;
  onCreateConversation: (title: string) => Promise<void>;
  onSelectKey: (id: string) => void;
  onSelectModel: (id: string) => void;
  onSelectTemperature: (value: number) => void;
  onSelectMaxTokens: (value: number | null) => void;
  onSelectExtraSystem: (value: string) => void;
  onSend: (content: string, mentions: MentionRef[]) => Promise<boolean>;
  onMentionsChange: (mentions: MentionRef[]) => void;
  onAbort: () => Promise<void>;
  onRegenerate: (messageId: string) => Promise<void>;
  onContinue: () => Promise<void>;
  onEditUser: (id: string, content: string) => Promise<void>;
  onActivate: (id: string) => Promise<void>;
  onRenameBranch: (branchId: string, label: string) => Promise<void>;
  onExport: (mode: "active" | "tree") => Promise<void>;
  onMoveConversation: (projectId: string | null) => Promise<void>;
  onDuplicateConversation: () => Promise<void>;
  onPromoteConversation: () => Promise<void>;
  onSaveProject: (input: Omit<ProjectUpdateInput, "id">) => Promise<void>;
  onRemoveProject: () => Promise<void>;
  onSetTags: (names: string[]) => Promise<void>;
  compactHistory: boolean;
  onToggleCompact: (value: boolean) => void;
  packetPreview: PacketPreviewResult | null;
  modelSwitchNotice: boolean;
  conversationCost: string | null;
  projectCost: string | null;
  showAllowOnce: boolean;
  onAllowOnce: () => void;
  onComposerDraft: (value: string) => void;
  onPin: (id: string, pinned: boolean) => Promise<void>;
  packets: ContextPacketDto[];
  privacyMode: PacketPrivacyMode;
  onPrivacyMode: (value: PacketPrivacyMode) => void;
  onCompilePacket: () => Promise<void>;
  onExportPacket: (packetId: string) => Promise<void>;
  onImportPacket: () => Promise<void>;
  onApplyPacket: (packetId: string) => Promise<void>;
  onClearPacket: () => Promise<void>;
  onOpenCaps: () => void;
  attachedFiles: ProjectFileDto[];
  onAttachFile: () => Promise<void>;
  onAttachFolder: () => Promise<void>;
  onRemoveFile: (id: string) => Promise<void>;
  onDropFiles: (files: File[]) => Promise<void>;
  composerInsert: string | null;
  onComposerInsertConsumed: () => void;
  pendingSkill: { id?: string; query: string } | null;
  onPendingSkillConsumed: () => void;
  onOpenSkills: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const modifier = window.hub.platform === "darwin" ? "⌘" : "Ctrl";
  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [mentionChips, setMentionChips] = useState<MentionSuggestion[]>([]);
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFileDto[]>([]);
  const mentionQueryRef = useRef<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);
  const [packetOpen, setPacketOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [artifacts, setArtifacts] = useState<ArtifactDto[]>([]);
  const [canvasId, setCanvasId] = useState<string | null>(null);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const autoOpenedArtifactRef = useRef<string | null>(null);
  const [projectMemories, setProjectMemories] = useState<ProjectMemoryDto[]>([]);
  const [libraryPrompts, setLibraryPrompts] = useState<PromptDto[]>([]);
  const [librarySkills, setLibrarySkills] = useState<SkillDto[]>([]);
  const [skillRun, setSkillRun] = useState<{
    title: string;
    steps: Array<{ id: string; title: string }>;
    status: "running" | "complete";
  } | null>(null);
  const [memoryOptedOut, setMemoryOptedOut] = useState(false);
  const [memorySuggestions, setMemorySuggestions] = useState<string[]>([]);
  const [conversationWorkspace, setConversationWorkspace] = useState<ConversationWorkspaceDto | null>(
    null,
  );
  const [tagDraft, setTagDraft] = useState("");
  const [projectName, setProjectName] = useState(project?.name ?? "");
  const [projectColor, setProjectColor] = useState<string | null>(project?.color ?? null);
  const [projectInstructions, setProjectInstructions] = useState(
    project?.instructions ?? "",
  );
  const [preferredProvider, setPreferredProvider] = useState(
    project?.preferredProvider ?? "",
  );
  const [preferredModel, setPreferredModel] = useState(project?.preferredModel ?? "");
  const modelSelectRef = useRef<HTMLSelectElement>(null);
  const customModelRef = useRef<HTMLInputElement>(null);
  const selectedKey =
    providerKeys.find((key) => key.id === selectedKeyId) ?? providerKeys[0] ?? null;
  const providerSlug = selectedKey?.providerSlug ?? null;
  const models = providerSlug ? catalogModelsForProvider(providerSlug) : [];
  const selectedCatalog: CatalogModel | null =
    providerSlug && selectedModel ? findCatalogModel(selectedModel, providerSlug) : null;
  const hasKey =
    selectedKeyId !== null && providerKeys.some((key) => key.id === selectedKeyId);
  const busy = streaming || sending;
  const path = activePath(messages);
  const activeIds = new Set(path.map((item) => item.id));
  const leaf = path[path.length - 1] ?? null;
  const selectedConversation =
    conversations.find((item) => item.id === selectedConversationId) ?? null;
  const canvasArtifact = artifacts.find((item) => item.id === canvasId) ?? null;
  const providerSlugs = [...new Set(providerKeys.map((item) => item.providerSlug))];
  const preferredModels = preferredProvider
    ? catalogModelsForProvider(preferredProvider)
    : [];
  const mentionPreviewRows: MentionSuggestion[] = [
    ...mentionChips,
    ...parseMentionTokens(draft)
      .mentions.filter(
        (item) => !mentionChips.some((chip) => chip.type === item.type && chip.query === item.query),
      )
      .map((item) => {
        if (item.type === "file") {
          const file = projectFiles.find((row) => row.name.toLowerCase() === item.query.toLowerCase());
          return {
            type: item.type,
            id: file?.id ?? null,
            query: item.query,
            label: file?.name ?? item.query,
            excerpt: file?.excerpt ?? item.query,
            tokens: file?.tokenEstimate ?? 0,
            available: file !== undefined,
          };
        }
        if (item.type === "conversation") {
          const conversation = conversations.find(
            (row) => row.title.toLowerCase() === item.query.toLowerCase(),
          );
          return {
            type: item.type,
            id: conversation?.id ?? null,
            query: item.query,
            label: conversation?.title ?? item.query,
            excerpt: conversation?.title ?? item.query,
            tokens: 0,
            available: conversation !== undefined && conversation.id !== selectedConversationId,
          };
        }
        if (item.type === "memory") {
          const memory = projectMemories.find(
            (row) =>
              row.title.toLowerCase() === item.query.toLowerCase() ||
              row.body.toLowerCase().includes(item.query.toLowerCase()),
          );
          return {
            type: item.type,
            id: memory?.id ?? null,
            query: item.query,
            label: memory?.title ?? item.query,
            excerpt: memory?.body.slice(0, 120) ?? item.query,
            tokens: memory ? Math.ceil(memory.body.length / 4) : 0,
            available: memory !== undefined,
          };
        }
        if (item.type === "skill") {
          const skill = librarySkills.find((row) => {
            const label = row.factoryId ? t(`skills.factory.${row.factoryId}`) : row.title;
            return (
              row.title.toLowerCase() === item.query.toLowerCase() ||
              label.toLowerCase() === item.query.toLowerCase() ||
              (row.factoryId ?? "").toLowerCase() === item.query.toLowerCase()
            );
          });
          return {
            type: item.type,
            id: skill?.id ?? null,
            query: item.query,
            label: skill?.title ?? item.query,
            excerpt: skill?.description.slice(0, 120) ?? item.query,
            tokens: skill ? Math.ceil(skill.prompt.length / 4) : 0,
            available: skill !== undefined,
          };
        }
        if (item.type === "prompt") {
          const prompt = libraryPrompts.find((row) => {
            const label = row.factoryId ? t(`prompts.factory.${row.factoryId}`) : row.title;
            return (
              row.title.toLowerCase() === item.query.toLowerCase() ||
              label.toLowerCase() === item.query.toLowerCase()
            );
          });
          return {
            type: item.type,
            id: prompt?.id ?? null,
            query: item.query,
            label: prompt?.title ?? item.query,
            excerpt: prompt?.body.slice(0, 120) ?? item.query,
            tokens: prompt ? Math.ceil(prompt.body.length / 4) : 0,
            available: prompt !== undefined,
          };
        }
        if (item.type === "packet") {
          const packet = packets.find(
            (row) =>
              row.origin.conversationLabel.toLowerCase() === item.query.toLowerCase() ||
              row.origin.projectLabel.toLowerCase() === item.query.toLowerCase(),
          );
          return {
            type: item.type,
            id: packet?.id ?? null,
            query: item.query,
            label: packet
              ? `${packet.origin.projectLabel} / ${packet.origin.conversationLabel}`
              : item.query,
            excerpt: packet?.origin.conversationLabel ?? item.query,
            tokens: packet?.tokenEstimate ?? 0,
            available: packet !== undefined,
          };
        }
        return {
          type: item.type,
          id: null,
          query: item.query,
          label: item.query,
          excerpt: "",
          tokens: 0,
          available: false,
        };
      }),
  ];

  useEffect(() => {
    setEditing(false);
    setTreeOpen(false);
    setPacketOpen(false);
    setTagDraft("");
    setDraft("");
    setMentionChips([]);
    onComposerDraft("");
    onMentionsChange([]);
  }, [onComposerDraft, onMentionsChange, selectedConversationId]);

  useEffect(() => {
    if (!composerInsert) {
      return;
    }
    setDraft(composerInsert);
    onComposerDraft(composerInsert);
    onComposerInsertConsumed();
  }, [composerInsert, onComposerDraft, onComposerInsertConsumed]);

  useEffect(() => {
    if (!pendingSkill) {
      return;
    }
    const remainder = draft;
    const mentions: MentionRef[] = [
      pendingSkill.id
        ? { type: "skill", id: pendingSkill.id }
        : { type: "skill", query: pendingSkill.query },
      ...mentionRefsFrom(mentionChips, remainder),
    ];
    const next = mentionVisibleContent(remainder);
    onPendingSkillConsumed();
    sendDraft(next || `@skill:${pendingSkill.query}`, mentions);
  }, [pendingSkill]);

  useEffect(() => {
    if (!skillRun || skillRun.status !== "running") {
      return;
    }
    const last = messages.at(-1);
    if (last?.role === "assistant" && last.status === "complete") {
      setSkillRun({ ...skillRun, status: "complete" });
    }
  }, [messages, skillRun]);

  useEffect(() => {
    void window.hub.files
      .list({ projectId: project?.id ?? null })
      .then(setProjectFiles)
      .catch(() => setProjectFiles([]));
  }, [attachedFiles, project?.id]);

  useEffect(() => {
    void window.hub.prompts
      .list()
      .then(setLibraryPrompts)
      .catch(() => setLibraryPrompts([]));
    void window.hub.skills
      .list()
      .then(setLibrarySkills)
      .catch(() => setLibrarySkills([]));
  }, []);

  useEffect(() => {
    if (!project) {
      setProjectMemories([]);
      setMemoryOptedOut(false);
      return;
    }
    void window.hub.memory
      .list({ projectId: project.id })
      .then(setProjectMemories)
      .catch(() => setProjectMemories([]));
    void window.hub.memory
      .getOptOut({ projectId: project.id })
      .then((row) => setMemoryOptedOut(row.optedOut))
      .catch(() => setMemoryOptedOut(false));
  }, [project]);

  useEffect(() => {
    if (!selectedConversationId) {
      setConversationWorkspace(null);
      setArtifacts([]);
      setCanvasId(null);
      autoOpenedArtifactRef.current = null;
      return;
    }
    const last = messages.at(-1);
    const op =
      last?.role === "assistant" && last.status === "complete"
        ? window.hub.workspace.refresh({ conversationId: selectedConversationId })
        : window.hub.workspace.get({ conversationId: selectedConversationId });
    void op.then(setConversationWorkspace).catch(() => setConversationWorkspace(null));
    void window.hub.artifacts
      .list({ conversationId: selectedConversationId })
      .then((rows) => {
        setArtifacts(rows);
        if (last?.role === "assistant" && last.status === "complete" && autoOpenedArtifactRef.current !== last.id) {
          const mermaid = rows.find((row) => row.sourceMessageId === last.id && row.kind === "mermaid");
          if (mermaid) {
            autoOpenedArtifactRef.current = last.id;
            setCanvasId(mermaid.id);
          }
        }
      })
      .catch(() => setArtifacts([]));
  }, [messages, selectedConversationId]);

  useEffect(() => {
    if (!project || memoryOptedOut || streaming || sending) {
      return;
    }
    const last = messages.at(-1);
    const prev = messages.at(-2);
    if (!last || last.role !== "assistant" || last.status !== "complete" || !prev || prev.role !== "user") {
      return;
    }
    void window.hub.memory
      .suggest({ projectId: project.id, text: `${prev.content}\n${last.content}` })
      .then((row) => {
        setMemorySuggestions(row.suggestions);
        setMemoryOptedOut(row.optedOut);
        if (row.suggestions.length > 0) {
          setMemoryOpen(true);
        }
      })
      .catch(() => setMemorySuggestions([]));
  }, [memoryOptedOut, messages, project, sending, streaming]);

  useEffect(() => {
    onMentionsChange(mentionRefsFrom(mentionChips, draft));
  }, [draft, mentionChips, onMentionsChange]);

  useEffect(() => {
    setProjectName(project?.name ?? "");
    setProjectColor(project?.color ?? null);
    setProjectInstructions(project?.instructions ?? "");
    setPreferredProvider(project?.preferredProvider ?? "");
    setPreferredModel(project?.preferredModel ?? "");
  }, [project]);

  const runSlashCommand = (command: SlashCommandId): void => {
    switch (command) {
      case "model":
        (customModelRef.current ?? modelSelectRef.current)?.focus();
        return;
      case "clear":
        void onCreateConversation(t("workspace.untitledChat"));
        return;
      case "compact":
        onToggleCompact(!compactHistory);
        return;
      case "packet":
        setPacketOpen(true);
        return;
      case "cap":
        onOpenCaps();
        return;
      case "skill":
        onOpenSkills();
        return;
    }
  };

  const sendDraft = (content: string, mentions: MentionRef[]): void => {
    const skillMention = mentions.find((item) => item.type === "skill");
    if (skillMention) {
      const skill = librarySkills.find((row) => {
        const label = row.factoryId ? t(`skills.factory.${row.factoryId}`) : row.title;
        const query = (skillMention.query ?? "").toLowerCase();
        return (
          row.id === skillMention.id ||
          row.title.toLowerCase() === query ||
          label.toLowerCase() === query ||
          (row.factoryId ?? "").toLowerCase() === query
        );
      });
      if (skill) {
        setSkillRun({
          title: skill.factoryId ? t(`skills.factory.${skill.factoryId}`) : skill.title,
          steps: skill.steps.map((step) => ({ id: step.id, title: step.title })),
          status: "running",
        });
      }
    }
    void onSend(content, mentions).then((ok) => {
      if (ok) {
        setDraft("");
        setMentionChips([]);
        onComposerDraft("");
        onMentionsChange([]);
      } else if (skillMention) {
        setSkillRun(null);
      }
    });
  };

  return (
    <div className="flex h-full min-h-0">
      <section className="flex w-64 shrink-0 flex-col border-r">
        <div className="border-b p-3">
          <h1 className="truncate text-sm font-semibold">
            {project
              ? project.name
              : importedInbox
                ? t("workspace.importedInbox")
                : t("workspace.inbox")}
          </h1>
          <p className="text-muted-foreground">
            {project
              ? t("workspace.conversations")
              : importedInbox
                ? t("workspace.importedInboxHint")
                : t("workspace.inboxHint")}
          </p>
        </div>
        <ScrollArea className="flex-1 p-2">
          {conversations.length === 0 ? (
            <p className="px-2 text-muted-foreground">
              {project
                ? t("workspace.noConversations", { modifier })
                : importedInbox
                  ? t("workspace.noConversationsImported")
                  : t("workspace.noConversationsInbox", { modifier })}
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {conversations.map((conversation) => (
                <Button
                  key={conversation.id}
                  type="button"
                  variant={
                    selectedConversationId === conversation.id ? "secondary" : "ghost"
                  }
                  className="h-8 w-full justify-start truncate"
                  data-testid="conversation-item"
                  aria-current={
                    selectedConversationId === conversation.id ? "true" : undefined
                  }
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  {conversation.title}
                </Button>
              ))}
            </div>
          )}
          {selectedConversation ? (
            <form
              className="mt-3 flex flex-col gap-1 border-t pt-2"
              onSubmit={(event) => {
                event.preventDefault();
                const next = tagDraft.trim();
                if (!next) {
                  return;
                }
                const names = selectedConversation.tags.includes(next)
                  ? selectedConversation.tags
                  : [...selectedConversation.tags, next];
                void onSetTags(names).then(() => setTagDraft(""));
              }}
            >
              <p className="px-1 text-[11px] text-muted-foreground">
                {t("workspace.tags")}
              </p>
              <div className="flex flex-wrap gap-1 px-1">
                {selectedConversation.tags.map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-6 px-2 text-[11px]"
                    aria-label={t("workspace.tagRemove", { tag })}
                    onClick={() => {
                      void onSetTags(
                        selectedConversation.tags.filter((item) => item !== tag),
                      );
                    }}
                  >
                    {tag} ×
                  </Button>
                ))}
              </div>
              <Input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                placeholder={t("workspace.tagPlaceholder")}
                aria-label={t("workspace.tagPlaceholder")}
                data-testid="conversation-tag"
              />
              <Button
                type="submit"
                size="sm"
                className="h-7"
                data-testid="conversation-tag-add"
              >
                {t("workspace.tagAdd")}
              </Button>
            </form>
          ) : null}
          {project ? (
            <form
              className="mt-3 flex flex-col gap-2 border-t pt-2"
              onSubmit={(event) => {
                event.preventDefault();
                const name = projectName.trim();
                if (!name) {
                  return;
                }
                void onSaveProject({
                  name,
                  color: projectColor,
                  instructions:
                    projectInstructions.trim().length > 0 ? projectInstructions : null,
                  preferredModel:
                    preferredModel.trim().length > 0 ? preferredModel.trim() : null,
                  preferredProvider:
                    preferredProvider.trim().length > 0 ? preferredProvider.trim() : null,
                });
              }}
            >
              <Input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                aria-label={t("workspace.projectPlaceholder")}
              />
              <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                {t("workspace.projectColor")}
                <div className="flex flex-wrap gap-1">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: color }}
                      aria-label={color}
                      aria-pressed={projectColor === color}
                      data-testid="project-color"
                      onClick={() => setProjectColor(color)}
                    />
                  ))}
                </div>
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                {t("workspace.projectInstructions")}
                <textarea
                  className="min-h-[4rem] resize-y rounded-md border bg-background px-2 py-1 text-[12px] text-foreground"
                  value={projectInstructions}
                  onChange={(event) => setProjectInstructions(event.target.value)}
                  aria-label={t("workspace.projectInstructions")}
                  data-testid="project-instructions"
                />
                <span>{t("workspace.projectInstructionsHint")}</span>
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                {t("workspace.preferredProvider")}
                <select
                  className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
                  value={preferredProvider}
                  onChange={(event) => setPreferredProvider(event.target.value)}
                  aria-label={t("workspace.preferredProvider")}
                >
                  <option value="">{t("workspace.preferredNone")}</option>
                  {providerSlugs.map((slug) => (
                    <option key={slug} value={slug}>
                      {slug}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                {t("workspace.preferredModel")}
                {preferredModels.length > 0 ? (
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
                    value={preferredModel}
                    onChange={(event) => setPreferredModel(event.target.value)}
                    aria-label={t("workspace.preferredModel")}
                  >
                    <option value="">{t("workspace.preferredNone")}</option>
                    {preferredModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={preferredModel}
                    onChange={(event) => setPreferredModel(event.target.value)}
                    aria-label={t("workspace.preferredModel")}
                  />
                )}
              </label>
              <Button type="submit" size="sm" className="h-7" data-testid="project-save">
                {t("workspace.saveProject")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7"
                data-testid="project-delete"
                onClick={() => {
                  if (
                    window.confirm(
                      t("workspace.deleteProjectConfirm", { name: project.name }),
                    )
                  ) {
                    void onRemoveProject();
                  }
                }}
              >
                {t("workspace.deleteProject")}
              </Button>
            </form>
          ) : null}
        </ScrollArea>
        {importedInbox ? null : (
          <form
            className="flex flex-col gap-1 border-t p-2"
            onSubmit={(event) => {
              event.preventDefault();
              const next = title.trim();
              if (!next) {
                return;
              }
              void onCreateConversation(next).then(() => setTitle(""));
            }}
          >
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("workspace.conversationPlaceholder")}
              aria-label={t("workspace.conversationPlaceholder")}
              data-testid="workspace-new-conversation-title"
            />
            <Button
              type="submit"
              size="sm"
              className="h-7"
              data-testid="workspace-new-conversation"
            >
              {t("workspace.newConversation")}
            </Button>
          </form>
        )}
      </section>
      <section className="flex min-w-0 flex-1 flex-col">
        {selectedConversationId ? (
          <>
            <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
              {providerKeys.length === 0 ? (
                <p className="text-muted-foreground">{t("workspace.noKey")}</p>
              ) : (
                <>
                  <label className="flex items-center gap-1">
                    <span className="text-muted-foreground">{t("workspace.key")}</span>
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={selectedKeyId ?? providerKeys[0]?.id}
                      onChange={(event) => onSelectKey(event.target.value)}
                      aria-label={t("workspace.key")}
                      data-testid="workspace-key"
                    >
                      {providerKeys.map((key) => (
                        <option key={key.id} value={key.id}>
                          {key.providerSlug} · {key.label} ({key.maskedKey})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="text-muted-foreground">{t("workspace.model")}</span>
                    {providerSlug === "custom" ? (
                      <Input
                        ref={customModelRef}
                        className="h-8 w-52"
                        value={selectedModel}
                        onChange={(event) => onSelectModel(event.target.value)}
                        aria-label={t("workspace.customModel")}
                        data-testid="workspace-custom-model"
                      />
                    ) : (
                      <select
                        ref={modelSelectRef}
                        className="h-8 max-w-72 rounded-md border bg-background px-2 text-sm"
                        value={selectedModel}
                        onChange={(event) => onSelectModel(event.target.value)}
                        aria-label={t("workspace.model")}
                        data-testid="workspace-model"
                      >
                        {models.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.label}
                            {model.vision ? ` · ${t("workspace.model.vision")}` : ""}
                            {model.tools ? ` · ${t("workspace.model.tools")}` : ""}
                            {` · ${model.contextWindow / 1000}k`}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>
                  {selectedCatalog ? (
                    <span className="text-[11px] text-muted-foreground">
                      {t("workspace.model.price", {
                        input: selectedCatalog.inputUsdPerMillion,
                        output: selectedCatalog.outputUsdPerMillion,
                      })}
                    </span>
                  ) : null}
                  <label className="flex items-center gap-1">
                    <span className="text-muted-foreground">
                      {t("workspace.temperature")}
                    </span>
                    <Input
                      className="h-8 w-16"
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      value={temperature}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value)) {
                          onSelectTemperature(Math.min(2, Math.max(0, value)));
                        }
                      }}
                      aria-label={t("workspace.temperature")}
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="text-muted-foreground">
                      {t("workspace.maxTokens")}
                    </span>
                    <Input
                      className="h-8 w-20"
                      type="number"
                      min={1}
                      placeholder={t("workspace.maxTokensDefault")}
                      value={maxTokens ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value.trim();
                        if (raw.length === 0) {
                          onSelectMaxTokens(null);
                          return;
                        }
                        const value = Number(raw);
                        if (Number.isFinite(value) && value >= 1) {
                          onSelectMaxTokens(Math.floor(value));
                        }
                      }}
                      aria-label={t("workspace.maxTokens")}
                    />
                  </label>
                </>
              )}
              <div className="ml-auto flex flex-wrap items-center gap-1">
                {conversationCost ? (
                  <span
                    className="text-[11px] text-muted-foreground"
                    data-testid="cost-conversation"
                  >
                    {t("workspace.cost.conversation", { usd: conversationCost })}
                  </span>
                ) : null}
                {projectCost ? (
                  <span
                    className="text-[11px] text-muted-foreground"
                    data-testid="cost-project"
                  >
                    {t("workspace.cost.project", { usd: projectCost })}
                  </span>
                ) : null}
                {packetPreview ? (
                  <span
                    className="rounded-md border px-2 py-1 text-[11px] text-muted-foreground"
                    data-testid="packet-badge"
                  >
                    {t("workspace.packet.badge", { n: packetPreview.tokenEstimate })}
                  </span>
                ) : null}
                <PacketPanel
                  packetPreview={packetPreview}
                  packets={packets}
                  projectId={project?.id ?? null}
                  appliedPacketId={selectedConversation?.activePacketId ?? null}
                  privacyMode={privacyMode}
                  busy={busy}
                  onPrivacyMode={onPrivacyMode}
                  onCompile={onCompilePacket}
                  onExport={onExportPacket}
                  onImport={onImportPacket}
                  onApply={onApplyPacket}
                  onClear={onClearPacket}
                  open={packetOpen}
                  onOpenChange={setPacketOpen}
                />
                {packetPreview?.estimatedCostUsd ? (
                  <span
                    className="text-[11px] text-muted-foreground"
                    data-testid="send-estimate"
                  >
                    {t("workspace.estimate", { usd: packetPreview.estimatedCostUsd })}
                  </span>
                ) : packetPreview && selectedCatalog === null ? (
                  <span className="text-[11px] text-muted-foreground">
                    {t("workspace.estimate.none")}
                  </span>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="memory-open"
                  aria-pressed={memoryOpen}
                  disabled={!project}
                  onClick={() => setMemoryOpen((open) => !open)}
                >
                  {t("memory.title")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="workspace-open"
                  aria-pressed={workspaceOpen}
                  onClick={() => setWorkspaceOpen((open) => !open)}
                >
                  {t("workspace.panel.title")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="canvas-toggle"
                  aria-pressed={canvasId !== null}
                  disabled={!selectedConversationId}
                  onClick={() => {
                    if (canvasId) {
                      setCanvasId(null);
                      return;
                    }
                    const latest = artifacts[0];
                    if (latest) {
                      setCanvasId(latest.id);
                    }
                  }}
                >
                  {t("artifacts.canvas")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="conversation-duplicate"
                  disabled={!selectedConversationId || busy}
                  onClick={() => {
                    void onDuplicateConversation();
                  }}
                >
                  {t("workspace.duplicate")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="conversation-to-project"
                  disabled={!selectedConversationId || busy}
                  onClick={() => {
                    void onPromoteConversation();
                  }}
                >
                  {t("workspace.toProject")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="tree-toggle"
                  aria-pressed={treeOpen}
                  onClick={() => setTreeOpen((open) => !open)}
                >
                  {treeOpen ? t("workspace.tree.hide") : t("workspace.tree.show")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!selectedConversationId || busy}
                  onClick={() => {
                    void onExport("active");
                  }}
                >
                  {t("workspace.export.active")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!selectedConversationId || busy}
                  onClick={() => {
                    void onExport("tree");
                  }}
                >
                  {t("workspace.export.tree")}
                </Button>
                {selectedConversation?.importSource ? (
                  <label className="flex items-center gap-1">
                    <span className="text-muted-foreground">{t("workspace.moveTo")}</span>
                    <select
                      className="h-8 max-w-48 rounded-md border bg-background px-2 text-sm"
                      value={selectedConversation.projectId ?? ""}
                      data-testid="import-move"
                      aria-label={t("workspace.moveTo")}
                      onChange={(event) => {
                        const value = event.target.value;
                        void onMoveConversation(value.length > 0 ? value : null);
                      }}
                    >
                      <option value="">{t("workspace.moveInbox")}</option>
                      {projects.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            </header>
            {modelSwitchNotice ? (
              <p
                className="border-b px-3 py-1 text-[11px] text-muted-foreground"
                role="status"
                data-testid="model-switch-notice"
              >
                {t("workspace.modelSwitch", { model: selectedModel })}
              </p>
            ) : null}
            {packetPreview?.overflow ? (
              <div
                className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-[12px]"
                role="status"
              >
                <p>
                  {t("workspace.overflow", {
                    window: packetPreview.contextWindow,
                    estimate: packetPreview.tokenEstimate,
                  })}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant={compactHistory ? "secondary" : "outline"}
                  data-testid="compact-history"
                  onClick={() => onToggleCompact(!compactHistory)}
                >
                  {compactHistory ? t("workspace.compact.off") : t("workspace.compact")}
                </Button>
              </div>
            ) : compactHistory ? (
              <p
                className="border-b px-3 py-1 text-[11px] text-muted-foreground"
                data-testid="compact-enabled"
              >
                {t("workspace.compact.on")}
              </p>
            ) : null}
            {packetPreview?.capBlocked ? (
              <p
                className="border-b px-3 py-1 text-[12px] text-destructive"
                role="status"
                data-testid="cap-block"
              >
                {t("workspace.cap.block", {
                  scope: t(`caps.scope.${packetPreview.capBlocked}`),
                })}
              </p>
            ) : packetPreview && packetPreview.capWarnings.length > 0 ? (
              <p
                className="border-b px-3 py-1 text-[12px]"
                role="status"
                data-testid="cap-warn"
              >
                {t("workspace.cap.warn", {
                  scope: t(`caps.scope.${packetPreview.capWarnings[0]}`),
                })}
              </p>
            ) : null}
            {exportNotice ? (
              <p
                className="border-b px-3 py-1 text-[11px] text-muted-foreground"
                role="status"
              >
                {exportNotice}
              </p>
            ) : null}
            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                <ScrollArea className="flex-1 p-4">
                  {path.length === 0 ? (
                    <p className="text-muted-foreground">{t("workspace.noMessages")}</p>
                  ) : (
                    <ol className="flex flex-col gap-2" aria-live="polite">
                      {path.map((message, index) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          messages={messages}
                          isLast={index === path.length - 1}
                          busy={busy}
                          hasKey={hasKey}
                          onRegenerate={() => {
                            void onRegenerate(message.id);
                          }}
                          onContinue={() => {
                            void onContinue();
                          }}
                          onEdit={async (content) => {
                            await onEditUser(message.id, content);
                          }}
                          onEditingChange={setEditing}
                          onActivateSibling={(id) => {
                            void onActivate(id);
                          }}
                          onPin={(pinned) => {
                            void onPin(message.id, pinned);
                          }}
                          onOpenArtifact={(messageId) => {
                            const match =
                              artifacts.find(
                                (item) => item.sourceMessageId === messageId && item.kind === "mermaid",
                              ) ?? artifacts.find((item) => item.sourceMessageId === messageId);
                            if (match) {
                              setCanvasId(match.id);
                            }
                          }}
                        />
                      ))}
                    </ol>
                  )}
                </ScrollArea>
                <label className="flex flex-col gap-1 border-t px-3 py-2 text-[12px]">
                  <span className="text-muted-foreground">
                    {t("workspace.extraSystem")}
                  </span>
                  <textarea
                    className="min-h-[2.5rem] resize-y rounded-md border bg-background px-2 py-1 text-[13px]"
                    value={extraSystem}
                    onChange={(event) => onSelectExtraSystem(event.target.value)}
                    aria-label={t("workspace.extraSystem")}
                  />
                </label>
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      data-testid="files-attach"
                      disabled={busy || editing}
                      onClick={() => {
                        void onAttachFile();
                      }}
                    >
                      {t("files.attach")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      data-testid="files-attach-folder"
                      disabled={busy || editing}
                      onClick={() => {
                        void onAttachFolder();
                      }}
                    >
                      {t("files.attachFolder")}
                    </Button>
                  </div>
                  {attachedFiles.length > 0 ? (
                    <ul className="flex flex-col gap-1" data-testid="files-attached">
                      {attachedFiles.map((file) => (
                        <li
                          key={file.id}
                          className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-[12px]"
                          data-testid="files-chip"
                        >
                          <span className="min-w-0 truncate">
                            {file.name}
                            <span className="ml-2 text-muted-foreground">
                              {t("files.tokens", { n: file.tokenEstimate })}
                            </span>
                            {file.truncated ? (
                              <span className="ml-2 text-muted-foreground">{t("files.truncated")}</span>
                            ) : null}
                            {file.visionRequired ? (
                              <span className="ml-2 text-muted-foreground">
                                {t("files.visionHint")}
                              </span>
                            ) : null}
                            {file.excerpt ? (
                              <span className="ml-2 text-muted-foreground">{file.excerpt}</span>
                            ) : null}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            data-testid="files-remove"
                            onClick={() => {
                              void onRemoveFile(file.id);
                            }}
                          >
                            {t("files.remove")}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {attachedFiles.length > 0 ? (
                    <p className="text-[11px] text-muted-foreground" data-testid="files-token-warning">
                      {t("files.tokenWarning", {
                        n: attachedFiles.reduce((sum, file) => sum + file.tokenEstimate, 0),
                      })}
                    </p>
                  ) : null}
                  {mentionChips.length > 0 ? (
                    <ul className="flex flex-col gap-1" data-testid="mention-chips">
                      {mentionChips.map((chip, index) => (
                        <li
                          key={`${chip.type}-${chip.id ?? chip.query}-${index}`}
                          className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-[12px]"
                          data-testid="mention-chip"
                        >
                          <span className="min-w-0 truncate">
                            @{chip.type}:{chip.query || chip.label}
                            <span className="ml-2 text-muted-foreground">
                              {t("mentions.tokens", { n: chip.tokens })}
                            </span>
                            {!chip.available ? (
                              <span className="ml-2 text-muted-foreground">{t("mentions.stub")}</span>
                            ) : null}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            data-testid="mention-remove"
                            onClick={() => {
                              setMentionChips((current) => current.filter((_, item) => item !== index));
                            }}
                          >
                            {t("mentions.remove")}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {mentionPreviewRows.length > 0 ? (
                    <div className="flex flex-col gap-1" data-testid="mention-preview">
                      <p className="text-[11px] font-medium">{t("mentions.preview")}</p>
                      {mentionPreviewRows.map((chip, index) => (
                        <p key={`preview-${chip.type}-${chip.id ?? chip.query}-${index}`} className="text-[11px] text-muted-foreground">
                          {chip.excerpt || chip.label} · {t("mentions.tokens", { n: chip.tokens })}
                        </p>
                      ))}
                      {(() => {
                        const n = mentionPreviewRows
                          .filter((chip) => chip.type === "conversation" || chip.type === "packet")
                          .reduce((sum, chip) => sum + chip.tokens, 0);
                        return (
                          <p
                            className="text-[11px] text-muted-foreground"
                            data-testid="mention-token-warning"
                          >
                            {n > MAX_MENTION_TOKENS
                              ? t("mentions.tokenOver", { cap: MAX_MENTION_TOKENS })
                              : t("mentions.tokenWarning", { n, cap: MAX_MENTION_TOKENS })}
                          </p>
                        );
                      })()}
                    </div>
                  ) : null}
                  {packetPreview?.included.some((item) => item.kind === "rag" || item.kind === "memory") ? (
                    <ul className="flex flex-col gap-1" data-testid="citations">
                      {packetPreview.included
                        .filter((item) => item.kind === "rag" || item.kind === "memory")
                        .map((item, index) => {
                          const target = item.label.replace(/^(?:Project memory|Retrieved chunk): /, "");
                          return (
                            <li key={`${item.kind}-${item.id ?? index}`}>
                              <button
                                type="button"
                                className="text-left text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                                data-testid={`citation-${item.kind}`}
                                data-citation-target={target}
                                onClick={() => {
                                  if (item.kind === "memory") {
                                    setMemoryOpen(true);
                                    return;
                                  }
                                  setWorkspaceOpen(false);
                                }}
                              >
                                {t(`workspace.packet.kind.${item.kind}`)} · {item.label}
                              </button>
                            </li>
                          );
                        })}
                    </ul>
                  ) : null}
                </div>
                {skillRun ? (
                  <div
                    className="border-t px-2 py-1.5"
                    data-testid="skill-run"
                    data-status={skillRun.status}
                  >
                    <p className="text-[12px] font-medium">
                      {t("skills.run.title", { name: skillRun.title })}
                    </p>
                    <ol className="mt-1 flex flex-wrap gap-1">
                      {skillRun.steps.map((step, index) => {
                        const current = skillRun.status === "running";
                        return (
                          <li
                            key={step.id}
                            data-testid="skill-step"
                            data-current={current ? "true" : "false"}
                            className={`rounded border px-1.5 py-0.5 text-[11px] ${
                              current ? "border-foreground" : "border-border text-muted-foreground"
                            }`}
                          >
                            {index + 1}. {step.title}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ) : null}
                <ChatComposer
                  key={selectedConversationId}
                  value={draft}
                  onChange={(value) => {
                    setDraft(value);
                    onComposerDraft(value);
                  }}
                  streaming={streaming}
                  sending={sending}
                  disabled={!hasKey || editing}
                  hasMentions={mentionChips.length > 0}
                  mentionSuggestions={mentionSuggestions}
                  onMentionQuery={(typed) => {
                    mentionQueryRef.current = typed;
                    if (!typed) {
                      setMentionSuggestions([]);
                      return;
                    }
                    const parts = mentionQueryParts(typed);
                    if (parts.kind === "types") {
                      setMentionSuggestions(
                        MENTION_TYPES.filter((item) => item.startsWith(parts.prefix)).map((type) => ({
                          type,
                          id: null,
                          query: "",
                          label: t(`mentions.type.${type}`),
                          excerpt: isMentionStubType(type) ? t("mentions.stub") : t(`mentions.type.${type}`),
                          tokens: 0,
                          available: !isMentionStubType(type),
                        })),
                      );
                      return;
                    }
                    const query = parts.query.toLowerCase();
                    if (parts.type === "file") {
                      setMentionSuggestions(
                        projectFiles
                          .filter((file) => file.name.toLowerCase().includes(query))
                          .slice(0, 8)
                          .map((file) => ({
                            type: "file" as const,
                            id: file.id,
                            query: file.name,
                            label: file.name,
                            excerpt: file.excerpt,
                            tokens: file.tokenEstimate,
                            available: true,
                          })),
                      );
                      return;
                    }
                    if (parts.type === "memory") {
                      setMentionSuggestions(
                        projectMemories
                          .filter(
                            (item) =>
                              item.title.toLowerCase().includes(query) ||
                              item.body.toLowerCase().includes(query),
                          )
                          .slice(0, 8)
                          .map((item) => ({
                            type: "memory" as const,
                            id: item.id,
                            query: item.title,
                            label: item.title,
                            excerpt: item.body.slice(0, 120),
                            tokens: Math.ceil(item.body.length / 4),
                            available: true,
                          })),
                      );
                      return;
                    }
                    if (parts.type === "skill") {
                      setMentionSuggestions(
                        librarySkills
                          .filter((item) => {
                            const label = item.factoryId
                              ? t(`skills.factory.${item.factoryId}`)
                              : item.title;
                            return (
                              label.toLowerCase().includes(query) ||
                              item.title.toLowerCase().includes(query) ||
                              item.description.toLowerCase().includes(query)
                            );
                          })
                          .slice(0, 8)
                          .map((item) => ({
                            type: "skill" as const,
                            id: item.id,
                            query: item.title,
                            label: item.factoryId ? t(`skills.factory.${item.factoryId}`) : item.title,
                            excerpt: item.description.slice(0, 120),
                            tokens: Math.ceil(item.prompt.length / 4),
                            available: true,
                          })),
                      );
                      return;
                    }
                    if (parts.type === "prompt") {
                      setMentionSuggestions(
                        libraryPrompts
                          .filter((item) => {
                            const label = item.factoryId
                              ? t(`prompts.factory.${item.factoryId}`)
                              : item.title;
                            return (
                              label.toLowerCase().includes(query) ||
                              item.title.toLowerCase().includes(query) ||
                              item.body.toLowerCase().includes(query)
                            );
                          })
                          .slice(0, 8)
                          .map((item) => ({
                            type: "prompt" as const,
                            id: item.id,
                            query: item.title,
                            label: item.factoryId ? t(`prompts.factory.${item.factoryId}`) : item.title,
                            excerpt: item.body.slice(0, 120),
                            tokens: Math.ceil(item.body.length / 4),
                            available: true,
                          })),
                      );
                      return;
                    }
                    if (parts.type === "conversation") {
                      setMentionSuggestions(
                        conversations
                          .filter(
                            (item) =>
                              item.id !== selectedConversationId &&
                              item.title.toLowerCase().includes(query),
                          )
                          .slice(0, 8)
                          .map((item) => ({
                            type: "conversation" as const,
                            id: item.id,
                            query: item.title,
                            label: item.title,
                            excerpt: item.title,
                            tokens: 0,
                            available: true,
                          })),
                      );
                      return;
                    }
                    setMentionSuggestions(
                      packets
                        .filter((item) => {
                          const hay = `${item.origin.conversationLabel} ${item.origin.projectLabel}`.toLowerCase();
                          return hay.includes(query);
                        })
                        .slice(0, 8)
                        .map((item) => ({
                          type: "packet" as const,
                          id: item.id,
                          query: item.origin.conversationLabel,
                          label: `${item.origin.projectLabel} / ${item.origin.conversationLabel}`,
                          excerpt: item.origin.conversationLabel,
                          tokens: item.tokenEstimate ?? 0,
                          available: true,
                        })),
                    );
                  }}
                  onPickMention={(item, replace) => {
                    const nextDraft = `${draft.slice(0, replace.start)}${draft.slice(replace.end)}`;
                    if (!item.query && item.id === null) {
                      const inserted = `${nextDraft.slice(0, replace.start)}@${item.type}:${nextDraft.slice(replace.start)}`;
                      setDraft(inserted);
                      onComposerDraft(inserted);
                      return;
                    }
                    setDraft(nextDraft);
                    onComposerDraft(nextDraft);
                    setMentionChips((current) =>
                      [...current, item].filter(
                        (chip, index, all) =>
                          all.findIndex((row) => row.type === chip.type && row.id === chip.id && row.query === chip.query) ===
                          index,
                      ),
                    );
                  }}
                  onRemoveLastMention={() => {
                    setMentionChips((current) => current.slice(0, -1));
                  }}
                  onSend={() => {
                    const mentions = mentionRefsFrom(mentionChips, draft);
                    const next = mentionVisibleContent(draft);
                    if (!next && mentions.length === 0) {
                      return;
                    }
                    sendDraft(
                      next || mentionChips.map((chip) => `@${chip.type}:${chip.query}`).join(" "),
                      mentions,
                    );
                  }}
                  onAbort={() => {
                    void onAbort();
                  }}
                  onSlashCommand={runSlashCommand}
                  onSkillSlash={(query, remainder) => {
                    if (!query) {
                      onOpenSkills();
                      return;
                    }
                    const mentions: MentionRef[] = [
                      { type: "skill", query },
                      ...mentionRefsFrom(mentionChips, remainder),
                    ];
                    const next = mentionVisibleContent(remainder);
                    sendDraft(next || `@skill:${query}`, mentions);
                  }}
                  onFilesDrop={(files) => {
                    void onDropFiles(files);
                  }}
                />
              </div>
              {canvasArtifact ? (
                <ArtifactCanvas
                  artifact={canvasArtifact}
                  versions={artifacts}
                  busy={busy}
                  onClose={() => setCanvasId(null)}
                  onSelectVersion={setCanvasId}
                  onSaveVersion={async (body) => {
                    setCanvasError(null);
                    try {
                      const next = await window.hub.artifacts.saveVersion({ id: canvasArtifact.id, body });
                      const rows = selectedConversationId
                        ? await window.hub.artifacts.list({ conversationId: selectedConversationId })
                        : [next];
                      setArtifacts(rows);
                      setCanvasId(next.id);
                    } catch {
                      setCanvasError(t("artifacts.error"));
                    }
                  }}
                  onPin={async (pinned) => {
                    setCanvasError(null);
                    try {
                      const next = await window.hub.artifacts.setPinned({ id: canvasArtifact.id, pinned });
                      setArtifacts((current) =>
                        current.map((item) =>
                          item.familyId === next.familyId ? { ...item, pinned: next.pinned } : item,
                        ),
                      );
                    } catch {
                      setCanvasError(t("artifacts.error"));
                    }
                  }}
                  onExport={async (format, svg) => {
                    setCanvasError(null);
                    try {
                      await window.hub.artifacts.exportFile({
                        id: canvasArtifact.id,
                        format,
                        ...(svg !== undefined ? { svg } : {}),
                      });
                    } catch {
                      setCanvasError(t("artifacts.error"));
                    }
                  }}
                />
              ) : null}
              {memoryOpen && project ? (
                <MemoryPanel
                  memories={projectMemories}
                  optedOut={memoryOptedOut}
                  suggestions={memorySuggestions}
                  canEdit
                  onCreate={async (title, body) => {
                    const created = await window.hub.memory.create({
                      projectId: project.id,
                      title,
                      body,
                      source: "manual",
                    });
                    setProjectMemories((current) => [created, ...current]);
                  }}
                  onUpdate={async (id, title, body) => {
                    const updated = await window.hub.memory.update({ id, title, body });
                    setProjectMemories((current) =>
                      current.map((item) => (item.id === id ? updated : item)),
                    );
                  }}
                  onRemove={async (id) => {
                    await window.hub.memory.remove({ id });
                    setProjectMemories((current) => current.filter((item) => item.id !== id));
                  }}
                  onSetOptOut={async (optedOut) => {
                    const row = await window.hub.memory.setOptOut({ projectId: project.id, optedOut });
                    setMemoryOptedOut(row.optedOut);
                    if (row.optedOut) {
                      setMemorySuggestions([]);
                    }
                  }}
                  onSaveSuggestion={async (body) => {
                    const created = await window.hub.memory.create({
                      projectId: project.id,
                      title: body.slice(0, 80),
                      body,
                      source: "suggested",
                    });
                    setProjectMemories((current) => [created, ...current]);
                    setMemorySuggestions((current) => current.filter((item) => item !== body));
                  }}
                  onDismissSuggestions={() => setMemorySuggestions([])}
                />
              ) : null}
              {workspaceOpen ? (
                <ConversationWorkspacePanel
                  workspace={conversationWorkspace}
                  artifacts={artifacts}
                  busy={busy}
                  onRefresh={async () => {
                    if (!selectedConversationId) {
                      return;
                    }
                    setConversationWorkspace(
                      await window.hub.workspace.refresh({ conversationId: selectedConversationId }),
                    );
                    setArtifacts(await window.hub.artifacts.list({ conversationId: selectedConversationId }));
                  }}
                  onOpenArtifact={(id) => setCanvasId(id)}
                  onAddTask={async (title) => {
                    if (!selectedConversationId) {
                      return;
                    }
                    const task = await window.hub.workspace.addTask({
                      conversationId: selectedConversationId,
                      title,
                    });
                    setConversationWorkspace((current) =>
                      current
                        ? { ...current, tasks: [...current.tasks, task] }
                        : {
                            conversationId: selectedConversationId,
                            summary: "",
                            decisions: [],
                            tasks: [task],
                            pins: [],
                          },
                    );
                  }}
                  onSetTaskDone={async (id, done) => {
                    const task = await window.hub.workspace.setTaskDone({ id, done });
                    setConversationWorkspace((current) =>
                      current
                        ? {
                            ...current,
                            tasks: current.tasks.map((item) => (item.id === id ? task : item)),
                          }
                        : current,
                    );
                  }}
                  onRemoveTask={async (id) => {
                    await window.hub.workspace.removeTask({ id });
                    setConversationWorkspace((current) =>
                      current
                        ? { ...current, tasks: current.tasks.filter((item) => item.id !== id) }
                        : current,
                    );
                  }}
                />
              ) : null}
              {treeOpen ? (
                <ConversationTree
                  messages={messages}
                  activeIds={activeIds}
                  labels={branchLabels}
                  activeBranchId={leaf?.branchId ?? null}
                  busy={busy}
                  onJump={(id) => {
                    void onActivate(id);
                  }}
                  onRename={onRenameBranch}
                />
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
            {t("workspace.pickConversation")}
          </div>
        )}
        {error ? (
          <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2">
            <p className="text-destructive" role="alert" data-testid="workspace-error">
              {error}
            </p>
            {showAllowOnce ? (
              <Button
                type="button"
                size="sm"
                data-testid="cap-allow-once"
                onClick={onAllowOnce}
                disabled={busy}
              >
                {t("workspace.cap.allowOnce")}
              </Button>
            ) : null}
          </div>
        ) : null}
        {canvasError ? (
          <p className="border-t px-3 py-2 text-destructive" role="alert" data-testid="artifact-error">
            {canvasError}
          </p>
        ) : null}
      </section>
    </div>
  );
}
