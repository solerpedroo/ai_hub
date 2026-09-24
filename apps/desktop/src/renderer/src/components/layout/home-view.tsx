import { type JSX, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  activePath,
  catalogModelsForProvider,
  recommendModelRoute,
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
  type AgentRunDetail,
  type OrchestrationRunDetail,
  type ProviderKeyDto,
  type LocalProviderStatusDto,
  type HealthSummaryDto,
  type ToolActivityDto,
  type AppPrefs,
} from "@ai-hub/shared";
import {
  ChatComposer,
  type MentionSuggestion,
  type SlashCommandId,
} from "@/components/chat/chat-composer";
import { VoicePanel } from "@/components/chat/voice-panel";
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
  health,
  selectedKeyId,
  selectedModel,
  temperature,
  maxTokens,
  extraSystem,
  streaming,
  sending,
  runHud,
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
  appPrefs,
  onAppPrefsPatch,
}: {
  project: ProjectDto | null;
  importedInbox: boolean;
  projects: ProjectDto[];
  conversations: ConversationDto[];
  selectedConversationId: string | null;
  messages: MessageDto[];
  error: string | null;
  providerKeys: ProviderKeyDto[];
  health: HealthSummaryDto[];
  selectedKeyId: string | null;
  selectedModel: string;
  temperature: number;
  maxTokens: number | null;
  extraSystem: string;
  streaming: boolean;
  sending: boolean;
  runHud: { tokensIn: number | null; tokensOut: number | null; tokensThinking: number | null; cacheReadTokens: number | null; cacheWriteTokens: number | null; costUsd: string | null; thinkingSupported: boolean | null } | null;
  branchLabels: BranchLabels;
  exportNotice: string | null;
  onSelectConversation: (id: string) => void;
  onCreateConversation: (title: string) => Promise<void>;
  onSelectKey: (id: string) => void;
  onSelectModel: (id: string) => void;
  onSelectTemperature: (value: number) => void;
  onSelectMaxTokens: (value: number | null) => void;
  onSelectExtraSystem: (value: string) => void;
  onSend: (content: string, mentions: MentionRef[], route?: { keyId: string; model: string; runMode: "plan" | "assist" | "agent" | "orchestrate" | "research"; effortLevel: "low" | "medium" | "high" | "max" }) => Promise<boolean>;
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
  appPrefs: AppPrefs | null;
  onAppPrefsPatch: (patch: Partial<AppPrefs>) => Promise<void>;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const modifier = window.hub.platform === "darwin" ? "⌘" : "Ctrl";
  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [runMode, setRunMode] = useState<"plan" | "assist" | "agent" | "orchestrate" | "research">("assist");
  const [effortLevel, setEffortLevel] = useState<"low" | "medium" | "high" | "max">("medium");
  const [autoRouter, setAutoRouter] = useState(false);
  const [autoRouteConfirmed, setAutoRouteConfirmed] = useState(false);
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
  const [projectNotes, setProjectNotes] = useState<import("@ai-hub/shared").ProjectNoteDto[]>([]);
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
  const [toolPath, setToolPath] = useState("");
  const [toolActivity, setToolActivity] = useState<ToolActivityDto | null>(null);
  const [toolBusy, setToolBusy] = useState(false);
  const [toolError, setToolError] = useState<string | null>(null);
  const [developerOutput, setDeveloperOutput] = useState<string | null>(null);
  const [developerBusy, setDeveloperBusy] = useState(false);
  const [localStatus, setLocalStatus] = useState<LocalProviderStatusDto | null>(null);
  const [developerTerminalCommand, setDeveloperTerminalCommand] = useState<"git-status" | "git-diff" | "git-log" | "node-version">("git-status");
  const [agentRun, setAgentRun] = useState<AgentRunDetail | null>(null);
  const [orchestrationRun, setOrchestrationRun] = useState<OrchestrationRunDetail | null>(null);
  const [agentPaths, setAgentPaths] = useState("README.md\npackage.json\nsrc/index.ts");
  const [agentBusy, setAgentBusy] = useState(false);
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
  const localModels: CatalogModel[] = (localStatus?.models ?? []).map((model) => ({ id: model.id, label: model.label, provider: "ollama", contextWindow: 8_192, inputUsdPerMillion: 0, outputUsdPerMillion: 0, vision: false, tools: false }));
  const localReady = localStatus?.available === true && localModels.length > 0;
  const models = providerSlug === "ollama" ? localModels : providerSlug ? catalogModelsForProvider(providerSlug) : [];
  const selectedCatalog: CatalogModel | null =
    providerSlug && selectedModel ? models.find((model) => model.id === selectedModel) ?? null : null;
  useEffect(() => {
    let active = true;
    const refresh = (): void => { void window.hub.providers.localStatus().then((status) => { if (active) setLocalStatus(status); }).catch(() => { if (active) setLocalStatus({ available: false, models: [], pdfRagAvailable: true }); }); };
    refresh();
    const timer = window.setInterval(refresh, 8_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (providerSlug === "ollama" && localStatus?.models[0] && !localStatus.models.some((model) => model.id === selectedModel)) onSelectModel(localStatus.models[0].id);
  }, [providerSlug, localStatus, selectedModel, onSelectModel]);
  const routerRecommendation = recommendModelRoute(draft);
  const routedModel = providerKeys.flatMap((key) => catalogModelsForProvider(key.providerSlug).map((model) => ({ key, model, cost: model.inputUsdPerMillion + model.outputUsdPerMillion, latency: health.find((sample) => sample.providerSlug === key.providerSlug)?.lastLatencyMs ?? Number.MAX_SAFE_INTEGER }))).sort((left, right) => routerRecommendation.tier === "frontier" ? right.cost - left.cost || left.latency - right.latency : left.cost - right.cost || left.latency - right.latency)[0] ?? null;
  const hasKey =
    selectedKeyId !== null && providerKeys.some((key) => key.id === selectedKeyId);
  const busy = streaming || sending;
  const path = activePath(messages);
  const activeIds = new Set(path.map((item) => item.id));
  const leaf = path[path.length - 1] ?? null;
  const selectedConversation =
    conversations.find((item) => item.id === selectedConversationId) ?? null;
  useEffect(() => {
    if (selectedConversation) {
      setRunMode(selectedConversation.runMode);
      setEffortLevel(selectedConversation.effortLevel);
    }
  }, [selectedConversation]);
  useEffect(() => {
    if (!project) { setToolActivity(null); return; }
    void window.hub.tools.getLatestActivity().then((activity) => {
      setToolActivity(activity?.projectId === project.id ? activity : null);
    }).catch(() => setToolActivity(null));
  }, [project]);
  useEffect(() => {
    if (!selectedConversationId) { setAgentRun(null); setOrchestrationRun(null); return; }
    void window.hub.agents.list({ conversationId: selectedConversationId }).then(async (runs) => {
      const latest = runs[0];
      setAgentRun(latest ? await window.hub.agents.get({ id: latest.id, projectId: latest.projectId, conversationId: latest.conversationId }) : null);
    }).catch(() => setAgentRun(null));
    void window.hub.orchestrations.list({ conversationId: selectedConversationId }).then((runs) => setOrchestrationRun(runs[0] ?? null)).catch(() => setOrchestrationRun(null));
  }, [selectedConversationId]);
  useEffect(() => {
    if (!agentRun || agentRun.status !== "running") return;
    const timer = window.setInterval(() => {
      void window.hub.agents.get({ id: agentRun.id, projectId: agentRun.projectId, conversationId: agentRun.conversationId }).then(setAgentRun).catch(() => undefined);
    }, 700);
    return () => window.clearInterval(timer);
  }, [agentRun]);
  useEffect(() => {
    if (!orchestrationRun || orchestrationRun.status !== "running") return;
    const timer = window.setInterval(() => {
      void window.hub.orchestrations.get({ id: orchestrationRun.id, projectId: orchestrationRun.projectId, conversationId: orchestrationRun.conversationId }).then(setOrchestrationRun).catch(() => undefined);
    }, 700);
    return () => window.clearInterval(timer);
  }, [orchestrationRun]);
  useEffect(() => {
    if (!agentRun?.reportArtifactId || !selectedConversationId) return;
    void window.hub.artifacts.list({ conversationId: selectedConversationId }).then((rows) => {
      setArtifacts(rows);
      setCanvasId(agentRun.reportArtifactId);
    }).catch(() => undefined);
  }, [agentRun?.reportArtifactId, selectedConversationId]);
  const saveRunSettings = async (nextMode: typeof runMode, nextEffort: typeof effortLevel): Promise<void> => {
    if (!selectedConversationId) return;
    setRunMode(nextMode); setEffortLevel(nextEffort);
    await window.hub.conversations.setRunSettings({ conversationId: selectedConversationId, runMode: nextMode, effortLevel: nextEffort });
  };
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
    if (pendingSkill.query === "research:") {
      onPendingSkillConsumed();
      void saveRunSettings("research", effortLevel);
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
    // The parent clears pendingSkill synchronously; adding unstable composer callbacks here would duplicate a send.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setProjectNotes([]);
      setMemoryOptedOut(false);
      return;
    }
    void window.hub.memory
      .list({ projectId: project.id })
      .then(setProjectMemories)
      .catch(() => setProjectMemories([]));
    void window.hub.notes
      .list({ projectId: project.id })
      .then(setProjectNotes)
      .catch(() => setProjectNotes([]));
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
    if (autoRouter && !autoRouteConfirmed) return;
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
    if (runMode === "agent") {
      const matchedSkill = skillMention
        ? librarySkills.find((skill) => skill.id === skillMention.id || skill.title.toLowerCase() === (skillMention.query ?? "").toLowerCase())
        : null;
      void prepareAgent(content, matchedSkill?.id);
      return;
    }
    if (runMode === "orchestrate") { void prepareOrchestration(content); return; }
    if (runMode === "research") { void prepareResearch(content); return; }
    const route = autoRouter && routedModel ? { keyId: routedModel.key.id, model: routedModel.model.id, runMode, effortLevel } : { keyId: selectedKeyId ?? "", model: selectedModel, runMode, effortLevel };
    void onSend(content, mentions, route).then((ok) => {
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

  const appendToolOutput = (content: string, activity: ToolActivityDto): void => {
    setToolActivity(activity);
    setDraft((current) => `${current}${current.trim().length > 0 ? "\n\n" : ""}[${t("tools.untrustedContext")}: ${activity.resultSummary ?? activity.toolId}]\n\`\`\`text\n${content}\n\`\`\``);
  };

  const requestProjectFile = async (): Promise<void> => {
    if (!project || toolPath.trim().length === 0) return;
    setToolError(null);
    setToolBusy(true);
    try {
      const result = await window.hub.tools.requestRead({ projectId: project.id, relativePath: toolPath.trim() });
      setToolActivity(result.activity);
      if (result.kind === "completed") { appendToolOutput(result.content, result.activity); setToolPath(""); }
      if (result.kind === "denied") setToolError(t("tools.error.denied"));
    } catch { setToolError(t("tools.error.read")); }
    finally { setToolBusy(false); }
  };

  const runDeveloperTool = async (kind: "tree" | "status" | "diff"): Promise<void> => {
    if (!project) return;
    setDeveloperBusy(true); setToolError(null);
    try {
      if (kind === "tree") { const result = await window.hub.tools.tree({ projectId: project.id }); setDeveloperOutput(result.entries.map((item) => `${item.kind === "directory" ? "▸" : "·"} ${item.path}`).join("\n")); }
      if (kind === "status") { const result = await window.hub.tools.gitStatus({ projectId: project.id }); setDeveloperOutput(result.output); }
      if (kind === "diff") { const result = await window.hub.tools.gitDiff({ projectId: project.id }); setDeveloperOutput(result.output); }
    } catch { setToolError(t("developer.error")); }
    finally { setDeveloperBusy(false); }
  };
  const reviewDeveloperDiff = async (intent: "code_review" | "generate_tests" | "explain_architecture" = "code_review"): Promise<void> => {
    if (!project || !selectedConversationId || !selectedKeyId) return;
    setDeveloperBusy(true); setToolError(null);
    try { const result = await window.hub.tools.reviewDiff({ projectId: project.id, conversationId: selectedConversationId, providerKeyId: selectedKeyId, model: selectedModel, intent }); setCanvasId(result.artifactId); setArtifacts(await window.hub.artifacts.list({ conversationId: selectedConversationId })); }
    catch { setToolError(t("developer.error")); }
    finally { setDeveloperBusy(false); }
  };
  const runDeveloperTerminal = async (): Promise<void> => {
    if (!project) return;
    setDeveloperBusy(true); setToolError(null);
    try { const result = await window.hub.tools.terminal({ projectId: project.id, command: developerTerminalCommand }); setDeveloperOutput(result.output); }
    catch { setToolError(t("developer.error")); }
    finally { setDeveloperBusy(false); }
  };

  const prepareAgent = async (goal: string, skillId?: string): Promise<void> => {
    if (!project || !selectedConversationId || !selectedKeyId || goal.trim().length === 0) return;
    const paths = agentPaths.split(/\r?\n|,/).map((path) => path.trim()).filter(Boolean).slice(0, 3);
    if (paths.length === 0) { setToolError(t("agents.error.paths")); return; }
    setAgentBusy(true); setToolError(null);
    try {
      const prepared = await window.hub.agents.prepare({
        projectId: project.id,
        conversationId: selectedConversationId,
        providerKeyId: selectedKeyId,
        model: selectedModel,
        goal,
        relativePaths: paths,
        maxSteps: Math.min(6, paths.length + 3),
        budgetUsd: "1.000000",
        timeoutSeconds: 300,
        ...(skillId ? { skillId } : {}),
      });
      setAgentRun(prepared);
      setDraft("");
    } catch { setToolError(t("agents.error.prepare")); }
    finally { setAgentBusy(false); }
  };

  const controlAgent = async (action: "start" | "pause" | "resume" | "cancel"): Promise<void> => {
    if (!agentRun) return;
    setAgentBusy(true); setToolError(null);
    try {
      const updated = await window.hub.agents[action]({ id: agentRun.id, projectId: agentRun.projectId, conversationId: agentRun.conversationId });
      setAgentRun(updated);
    } catch { setToolError(t("agents.error.control")); }
    finally { setAgentBusy(false); }
  };

  const prepareOrchestration = async (goal: string): Promise<void> => {
    if (!project || !selectedConversationId || !selectedKeyId || goal.trim().length === 0) return;
    const paths = agentPaths.split(/\r?\n|,/).map((path) => path.trim()).filter(Boolean).slice(0, 3);
    if (paths.length === 0) { setToolError(t("agents.error.paths")); return; }
    setAgentBusy(true); setToolError(null);
    try {
      const prepared = await window.hub.orchestrations.prepare({ projectId: project.id, conversationId: selectedConversationId, providerKeyId: selectedKeyId, model: selectedModel, goal, relativePaths: paths, maxSteps: Math.min(6, paths.length + 3), budgetUsd: "1.000000", timeoutSeconds: 300, parallelism: 2, budgetMode: "shared" });
      setOrchestrationRun(prepared); setDraft("");
    } catch { setToolError(t("orchestration.error.prepare")); }
    finally { setAgentBusy(false); }
  };

  const prepareResearch = async (goal: string): Promise<void> => {
    if (!project || !selectedConversationId || !selectedKeyId || goal.trim().length === 0) return;
    setAgentBusy(true); setToolError(null);
    try {
      const prepared = await window.hub.orchestrations.prepareResearch({
        projectId: project.id,
        conversationId: selectedConversationId,
        providerKeyId: selectedKeyId,
        model: selectedModel,
        goal,
        budgetUsd: "1.000000",
        timeoutSeconds: 300,
      });
      setOrchestrationRun(prepared);
      setDraft("");
    } catch {
      setToolError(t("research.error.prepare"));
    } finally {
      setAgentBusy(false);
    }
  };

  const controlOrchestration = async (action: "start" | "pause" | "resume" | "cancel"): Promise<void> => {
    if (!orchestrationRun) return;
    setAgentBusy(true); setToolError(null);
    try { setOrchestrationRun(await window.hub.orchestrations[action]({ id: orchestrationRun.id, projectId: orchestrationRun.projectId, conversationId: orchestrationRun.conversationId })); }
    catch { setToolError(t("orchestration.error.control")); }
    finally { setAgentBusy(false); }
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
              <span className="rounded border px-2 py-1 text-[11px]" role="status" data-testid="offline-status">{localReady ? t(providerSlug === "ollama" ? "offline.localMode" : "offline.cloudMode") : t(localStatus?.available ? "offline.noModels" : "offline.localUnavailable")}</span>
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
                  <label className="flex items-center gap-1 text-[11px]"><span>{t("runMode.label")}</span><select className="h-8 rounded border bg-background px-1" value={runMode} onChange={(event) => void saveRunSettings(event.target.value as typeof runMode, effortLevel)}><option value="assist">Assist</option><option value="plan">Plan</option><option value="agent">{t("agents.mode")}</option><option value="orchestrate">{t("orchestration.mode")}</option><option value="research">{t("research.mode")}</option></select></label>
                  <label className="flex items-center gap-1 text-[11px"><span>{t("effort.label")}</span><select className="h-8 rounded border bg-background px-1" value={effortLevel} onChange={(event) => void saveRunSettings(runMode, event.target.value as typeof effortLevel)}>{["low", "medium", "high", "max"].map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
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
                  <label className="flex items-center gap-1 text-[11px]">
                    <input type="checkbox" checked={autoRouter} onChange={(event) => { setAutoRouter(event.target.checked); setAutoRouteConfirmed(false); }} />
                    {t("council.router.auto")}
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
                          {...(project
                            ? {
                                onSaveNote: (messageId: string) => {
                                  void window.hub.notes
                                    .createFromMessage({ projectId: project.id, messageId })
                                    .then((note) => setProjectNotes((current) => [note, ...current]))
                                    .catch(() => setToolError(t("notes.error.save")));
                                },
                              }
                            : {})}
                          onSaveTasks={(messageId) => {
                            if (!selectedConversationId) return;
                            void window.hub.workspace
                              .tasksFromMessage({ conversationId: selectedConversationId, messageId })
                              .then((tasks) => {
                                setConversationWorkspace((current) =>
                                  current
                                    ? { ...current, tasks: [...current.tasks, ...tasks] }
                                    : {
                                        conversationId: selectedConversationId,
                                        summary: "",
                                        decisions: [],
                                        tasks,
                                        pins: [],
                                      },
                                );
                                setWorkspaceOpen(true);
                              })
                              .catch(() => setToolError(t("tasks.error.save")));
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
                <div className="flex flex-wrap gap-2 border-t px-2 py-1 text-[11px] text-muted-foreground" data-testid="run-hud">
                  <span>{t("hud.mode")}: {runMode}</span><span>{t("hud.effort")}: {effortLevel}</span>
                  <span>{t("hud.context")}: {packetPreview?.tokenEstimate ?? "—"}/{packetPreview?.contextWindow ?? "—"}</span>
                  <span>{t("hud.tokens")}: {runHud?.tokensIn ?? "—"}/{runHud?.tokensOut ?? "—"}</span><span>{t("hud.turnCost")}: {runHud?.costUsd ?? conversationCost ?? "—"}</span>
                  <span>{t("hud.thinking")}: {runHud?.tokensThinking ?? "—"}</span><span>{t("hud.cache")}: {runHud?.cacheReadTokens ?? "—"}/{runHud?.cacheWriteTokens ?? "—"}</span>
                  {runHud?.thinkingSupported === false ? <span>{t("hud.thinkingUnavailable")}</span> : null}
                  {toolActivity ? <span data-testid="tool-activity">{t("tools.activity")}: {toolActivity.toolId} · {toolActivity.argsSummary} · {toolActivity.resultSummary ?? t(`tools.status.${toolActivity.status}`)}</span> : null}
                </div>
                {runMode === "agent" || agentRun ? (
                  <section className="border-t px-2 py-2" data-testid="agent-run">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-medium">{t("agents.title")}</p>
                      {agentRun ? <span className="text-[11px] text-muted-foreground" data-testid="agent-status">{t(`agents.status.${agentRun.status}`)}</span> : null}
                    </div>
                    {!agentRun ? (
                      <>
                        <textarea
                          className="mt-1 min-h-16 w-full rounded border bg-background px-2 py-1 text-[12px]"
                          value={agentPaths}
                          onChange={(event) => setAgentPaths(event.target.value)}
                          aria-label={t("agents.pathsLabel")}
                          placeholder={t("agents.pathsPlaceholder")}
                        />
                        <Button type="button" size="sm" variant="ghost" className="mt-1" onClick={() => setDraft(t("agents.factory.goal"))}>
                          {t("agents.factory.action")}
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-[11px] text-muted-foreground">{agentRun.planSummary}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{t("agents.limits", { steps: agentRun.maxSteps, budget: agentRun.budgetUsd, seconds: agentRun.timeoutSeconds })}</p>
                        <ol className="mt-1 flex flex-wrap gap-1">
                          {agentRun.steps.map((step) => (
                            <li key={step.id} className="rounded border px-1.5 py-0.5 text-[11px]" data-testid="agent-step" data-status={step.status}>
                              {step.ordinal}. {step.title} · {t(`agents.step.${step.status}`)}
                              {step.tokensIn !== null || step.tokensOut !== null ? ` · ${t("agents.step.tokens", { input: step.tokensIn ?? 0, output: step.tokensOut ?? 0 })}` : ""}
                              {step.costUsd !== null ? ` · ${t("agents.step.cost", { usd: step.costUsd })}` : ""}
                            </li>
                          ))}
                        </ol>
                        {agentRun.status === "awaiting_confirmation" ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <p className="text-[11px] text-muted-foreground">{t("agents.confirmDisclosure", { provider: agentRun.provider, model: agentRun.model })}</p>
                            <Button type="button" size="sm" disabled={agentBusy} onClick={() => void controlAgent("start")} data-testid="agent-confirm">{t("agents.confirm")}</Button>
                            <Button type="button" size="sm" variant="outline" disabled={agentBusy} onClick={() => void controlAgent("cancel")}>{t("agents.cancel")}</Button>
                          </div>
                        ) : null}
                        {agentRun.status === "running" ? <div className="mt-2 flex gap-2"><Button type="button" size="sm" variant="outline" disabled={agentBusy} onClick={() => void controlAgent("pause")}>{t("agents.pause")}</Button><Button type="button" size="sm" variant="outline" disabled={agentBusy} onClick={() => void controlAgent("cancel")}>{t("agents.cancel")}</Button></div> : null}
                        {agentRun.status === "paused" ? <div className="mt-2 flex gap-2"><Button type="button" size="sm" disabled={agentBusy} onClick={() => void controlAgent("resume")}>{t("agents.resume")}</Button><Button type="button" size="sm" variant="outline" disabled={agentBusy} onClick={() => void controlAgent("cancel")}>{t("agents.cancel")}</Button></div> : null}
                      </>
                    )}
                  </section>
                ) : null}
                {runMode === "orchestrate" || runMode === "research" || orchestrationRun ? (
                  <section className="border-t px-2 py-2" data-testid="orchestration-run">
                    <div className="flex items-center justify-between gap-2"><p className="text-[12px] font-medium">{t("orchestration.title")}</p>{orchestrationRun ? <span className="text-[11px] text-muted-foreground">{t(`agents.status.${orchestrationRun.status}`)}</span> : null}</div>
                    {!orchestrationRun ? <p className="mt-1 text-[11px] text-muted-foreground">{t("orchestration.empty")}</p> : <>
                      <p className="mt-1 text-[11px] text-muted-foreground">{t("orchestration.disclosure", { provider: orchestrationRun.provider, model: orchestrationRun.model, budget: orchestrationRun.budgetUsd })}</p>
                      <ol className="mt-1 flex flex-wrap gap-1">{orchestrationRun.nodes.map((node) => <li key={node.id} className="rounded border px-1.5 py-0.5 text-[11px]" data-testid="orchestration-node" data-status={node.status}>{t(`orchestration.role.${node.role}`)} · {t(`agents.status.${node.status}`)} · {node.provider}/{node.model} · {t("orchestration.usage", { input: node.tokensIn, output: node.tokensOut, cost: node.costUsd })}</li>)}</ol>
                      <ol className="mt-1 flex flex-wrap gap-1">{orchestrationRun.handoffs.map((handoff) => <li key={handoff.id} className="rounded border px-1.5 py-0.5 text-[11px]" data-testid="orchestration-handoff">{handoff.systemMessageSummary} · {t(`orchestration.handoff.${handoff.status}`)}</li>)}</ol>
                      {orchestrationRun.status === "awaiting_confirmation" ? <div className="mt-2 flex gap-2"><Button type="button" size="sm" disabled={agentBusy} onClick={() => void controlOrchestration("start")}>{t("orchestration.confirm")}</Button><Button type="button" size="sm" variant="outline" disabled={agentBusy} onClick={() => void controlOrchestration("cancel")}>{t("agents.cancel")}</Button></div> : null}
                      {orchestrationRun.status === "running" ? <div className="mt-2 flex gap-2"><Button type="button" size="sm" variant="outline" disabled={agentBusy} onClick={() => void controlOrchestration("pause")}>{t("agents.pause")}</Button><Button type="button" size="sm" variant="outline" disabled={agentBusy} onClick={() => void controlOrchestration("cancel")}>{t("agents.cancel")}</Button></div> : null}
                      {orchestrationRun.status === "paused" ? <div className="mt-2 flex gap-2"><Button type="button" size="sm" disabled={agentBusy} onClick={() => void controlOrchestration("resume")}>{t("agents.resume")}</Button><Button type="button" size="sm" variant="outline" disabled={agentBusy} onClick={() => void controlOrchestration("cancel")}>{t("agents.cancel")}</Button></div> : null}
                    </>}
                  </section>
                ) : null}
                {project ? (
                  <div className="flex flex-wrap items-center gap-2 border-t px-2 py-1.5" data-testid="permission-center">
                    <Input className="h-7 max-w-64" value={toolPath} onChange={(event) => setToolPath(event.target.value)} placeholder={t("tools.pathPlaceholder")} aria-label={t("tools.pathPlaceholder")} />
                    <Button type="button" size="sm" variant="outline" disabled={toolBusy || toolPath.trim().length === 0} onClick={() => void requestProjectFile()} data-testid="tools-read-file">{t("tools.readFile")}</Button>
                    <Button type="button" size="sm" variant="ghost" disabled={toolBusy} onClick={() => void window.hub.tools.pickProjectRoot({ projectId: project.id })}>{t("tools.chooseRoot")}</Button>
                    {toolError ? <span role="alert" className="text-destructive">{toolError}</span> : null}
                  </div>
                ) : null}
                {project ? (
                  <section className="border-t px-2 py-2" data-testid="developer-mode">
                    <div className="flex flex-wrap items-center gap-2"><p className="text-[12px] font-medium">{t("developer.title")}</p><Button type="button" size="sm" variant="outline" disabled={developerBusy} onClick={() => void runDeveloperTool("tree")}>{t("developer.tree")}</Button><Button type="button" size="sm" variant="outline" disabled={developerBusy} onClick={() => void runDeveloperTool("status")}>{t("developer.status")}</Button><Button type="button" size="sm" variant="outline" disabled={developerBusy} onClick={() => void runDeveloperTool("diff")} data-testid="developer-diff">{t("developer.diff")}</Button><select className="h-8 rounded border bg-background px-2 text-xs" value={developerTerminalCommand} onChange={(event) => setDeveloperTerminalCommand(event.target.value as typeof developerTerminalCommand)} aria-label={t("developer.terminal")}><option value="git-status">git status</option><option value="git-diff">git diff</option><option value="git-log">git log -1</option><option value="node-version">node --version</option></select><Button type="button" size="sm" variant="outline" disabled={developerBusy} onClick={() => void runDeveloperTerminal()}>{t("developer.terminal")}</Button><Button type="button" size="sm" disabled={developerBusy || !hasKey} onClick={() => void reviewDeveloperDiff()} data-testid="developer-review">{t("developer.review")}</Button><Button type="button" size="sm" variant="ghost" disabled={developerBusy || !hasKey} onClick={() => void reviewDeveloperDiff("generate_tests")}>{t("developer.tests")}</Button><Button type="button" size="sm" variant="ghost" disabled={developerBusy || !hasKey} onClick={() => void reviewDeveloperDiff("explain_architecture")}>{t("developer.architecture")}</Button></div>
                    {developerOutput ? <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-[11px]" data-testid="developer-output">{developerOutput}</pre> : <p className="mt-1 text-[11px] text-muted-foreground">{t("developer.hint")}</p>}
                  </section>
                ) : null}
                <VoicePanel
                  enabled={Boolean(selectedConversationId)}
                  conversationId={selectedConversationId}
                  prefs={appPrefs}
                  messages={messages}
                  streaming={streaming}
                  sending={sending}
                  hasKey={hasKey}
                  hasConversation={Boolean(selectedConversationId)}
                  locale={i18n.language}
                  onSendTranscript={async (text) => {
                    const voiceMode = runMode === "plan" || runMode === "assist" ? runMode : "assist";
                    return onSend(text, [], {
                      keyId: selectedKeyId ?? "",
                      model: selectedModel,
                      runMode: voiceMode,
                      effortLevel,
                    });
                  }}
                  onAbortChat={() => {
                    void onAbort();
                  }}
                  onPrefsChange={onAppPrefsPatch}
                />
                <ChatComposer
                  key={selectedConversationId}
                  value={draft}
                  onChange={(value) => {
                    setDraft(value);
                    setAutoRouteConfirmed(false);
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
                {autoRouter && routedModel ? <div className="flex items-center gap-2 border-t px-2 py-1 text-[11px] text-muted-foreground" data-testid="chat-router"><span>{t(`council.router.${routerRecommendation.reason}`)} · {routedModel.key.label} · {routedModel.model.label}</span><span>{t("council.router.cost", { usd: (routedModel.cost / 1_000_000 * (Math.ceil(draft.length / 4) + 1024)).toFixed(6) })} · {routedModel.latency === Number.MAX_SAFE_INTEGER ? t(`council.router.speed.${routerRecommendation.tier}`) : t("council.router.latency", { ms: routedModel.latency })}</span><Button type="button" size="sm" variant={autoRouteConfirmed ? "secondary" : "outline"} onClick={() => setAutoRouteConfirmed(true)}>{autoRouteConfirmed ? t("council.router.confirmed") : t("council.router.confirm")}</Button></div> : null}
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
                  notes={projectNotes}
                  busy={busy}
                  onRefresh={async () => {
                    if (!selectedConversationId) {
                      return;
                    }
                    setConversationWorkspace(
                      await window.hub.workspace.refresh({ conversationId: selectedConversationId }),
                    );
                    setArtifacts(await window.hub.artifacts.list({ conversationId: selectedConversationId }));
                    if (project) {
                      setProjectNotes(await window.hub.notes.list({ projectId: project.id }));
                    }
                  }}
                  onOpenArtifact={(id) => setCanvasId(id)}
                  onRemoveNote={async (id) => {
                    await window.hub.notes.remove({ id });
                    setProjectNotes((current) => current.filter((note) => note.id !== id));
                  }}
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
