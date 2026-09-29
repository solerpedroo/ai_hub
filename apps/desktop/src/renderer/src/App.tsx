import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type {
  BranchLabels,
  ChatSendInput,
  ChatSendResult,
  ContextPacketDto,
  ConversationDto,
  CostsAggregateResult,
  GatewayErrorCode,
  HealthSummaryDto,
  MentionRef,
  MessageDto,
  PacketPreviewResult,
  PacketPrivacyMode,
  ProjectDto,
  ProjectUpdateInput,
  ProjectFileDto,
  ProviderKeyDto,
  SearchHit,
  AppPrefs,
} from "@ai-hub/shared";
import {
  catalogModelsForProvider,
  classifyHubIpcError,
  findCatalogModel,
  shouldShowOnboarding,
  upsertActivated,
  WIZARD_TTFT_BUDGET_MS,
} from "@ai-hub/shared";
import { TitleBar } from "@/components/layout/title-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { StatusBar } from "@/components/layout/status-bar";
import { HomeView } from "@/components/layout/home-view";
import { SettingsView } from "@/components/layout/settings-view";
import { DebugView } from "@/components/layout/debug-view";
import { ImportView } from "@/components/layout/import-view";
import { PromptsView } from "@/components/layout/prompts-view";
import { SkillsView } from "@/components/layout/skills-view";
import { OnboardingView } from "@/components/layout/onboarding-view";
import {
  ChromeCommandPalette,
  type PaletteModelOption,
} from "@/components/layout/command-palette";
import { KeyboardShortcutsDialog } from "@/components/layout/keyboard-shortcuts";
import type { AppView, SettingsSection } from "@/components/layout/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function applySendResult(current: MessageDto[], result: ChatSendResult): MessageDto[] {
  let next = current;
  if (result.userMessage) {
    next = upsertActivated(next, result.userMessage);
  }
  return upsertActivated(next, result.assistant);
}

const GATEWAY_ERROR_KEYS = new Set<GatewayErrorCode>([
  "timeout",
  "rate_limit",
  "auth",
  "context_overflow",
  "quota",
  "network",
  "unknown",
]);

function workspaceErrorText(
  t: TFunction,
  error: unknown,
): { text: string; cap: boolean } {
  const message = error instanceof Error ? error.message : String(error);
  const classified = classifyHubIpcError(message);
  if (classified.kind === "cap" && classified.scope) {
    return {
      text: t("workspace.error.cap", { scope: t(`caps.scope.${classified.scope}`) }),
      cap: true,
    };
  }
  if (classified.kind === "unknown_model") {
    return { text: t("workspace.error.unknownModel"), cap: false };
  }
  if (message.includes("files:vision_required")) {
    return { text: t("files.error.vision"), cap: false };
  }
  if (message.includes("files:too_large")) {
    return { text: t("files.error.tooLarge"), cap: false };
  }
  if (message.includes("files:unsupported")) {
    return { text: t("files.error.unsupported"), cap: false };
  }
  if (message.includes("files:project_mismatch")) {
    return { text: t("files.error.projectMismatch"), cap: false };
  }
  if (message.includes("files:limit")) {
    return { text: t("files.error.limit"), cap: false };
  }
  if (message.includes("mentions:unavailable")) {
    return { text: t("mentions.error.unavailable"), cap: false };
  }
  if (message.includes("mentions:not_found")) {
    return { text: t("mentions.error.notFound"), cap: false };
  }
  if (message.includes("mentions:limit")) {
    return { text: t("mentions.error.limit"), cap: false };
  }
  if (
    classified.kind === "gateway" &&
    classified.code &&
    GATEWAY_ERROR_KEYS.has(classified.code)
  ) {
    return { text: t(`workspace.error.${classified.code}`), cap: false };
  }
  return { text: t("workspace.error.generic"), cap: false };
}

function fileIdsPayload(files: ProjectFileDto[]): { fileIds: string[] } | Record<string, never> {
  return files.length > 0 ? { fileIds: files.map((file) => file.id) } : {};
}

function mentionsPayload(
  mentions: MentionRef[],
): { mentions: MentionRef[] } | Record<string, never> {
  return mentions.length > 0 ? { mentions } : {};
}

function chatEventErrorText(t: TFunction, code: GatewayErrorCode): string {
  if (GATEWAY_ERROR_KEYS.has(code)) {
    return t(`workspace.error.${code}`);
  }
  return t("workspace.error.chat", { code });
}

function titleFromFirstPrompt(content: string): string | null {
  const normalized = content
    .replace(/[`#*_>[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length < 3) {
    return null;
  }
  const sentence = normalized.split(/(?<=[.!?])\s/)[0] ?? normalized;
  return sentence.slice(0, 80).trim();
}

export function App(): JSX.Element {
  const { t } = useTranslation();
  const [view, setView] = useState<AppView>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [importedInbox, setImportedInbox] = useState(false);
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    null,
  );
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [providerKeys, setProviderKeys] = useState<ProviderKeyDto[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [temperature, setTemperature] = useState(1);
  const [maxTokens, setMaxTokens] = useState<number | null>(null);
  const [extraSystem, setExtraSystem] = useState("");
  const [run, setRun] = useState<{ runId: string; conversationId: string; tokensIn: number | null; tokensOut: number | null; tokensThinking: number | null; cacheReadTokens: number | null; cacheWriteTokens: number | null; costUsd: string | null; thinkingSupported: boolean | null } | null>(null);
  const [sending, setSending] = useState(false);
  const [activating, setActivating] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [branchLabels, setBranchLabels] = useState<BranchLabels>({});
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [compactHistory, setCompactHistory] = useState(false);
  const [packetPreview, setPacketPreview] = useState<PacketPreviewResult | null>(null);
  const [packets, setPackets] = useState<ContextPacketDto[]>([]);
  const [privacyMode, setPrivacyMode] = useState<PacketPrivacyMode>("normal");
  const [appPrefs, setAppPrefs] = useState<AppPrefs | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [threadStartModel, setThreadStartModel] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthSummaryDto[]>([]);
  const [costs, setCosts] = useState<CostsAggregateResult | null>(null);
  const [showAllowOnce, setShowAllowOnce] = useState(false);
  const [composerDraft, setComposerDraft] = useState("");
  const [composerInsert, setComposerInsert] = useState<string | null>(null);
  const [pendingSkill, setPendingSkill] = useState<{ id?: string; query: string } | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<ProjectFileDto[]>([]);
  const [mentionRefs, setMentionRefs] = useState<MentionRef[]>([]);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("general");
  const [fallback, setFallback] = useState<{
    messageId: string;
    code: GatewayErrorCode;
    failedProvider: string;
    suggestProviderSlug: string;
    suggestKeyId: string;
    suggestModel: string;
  } | null>(null);
  const [fallbackPreview, setFallbackPreview] = useState<PacketPreviewResult | null>(
    null,
  );
  const projectInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const selectedModelRef = useRef(selectedModel);
  const searchGeneration = useRef(0);
  const lastSendRef = useRef<ChatSendInput | null>(null);
  const wizardStartedAt = useRef<number | null>(null);

  const reportComposerDraft = useCallback((value: string): void => {
    setComposerDraft(value);
  }, []);

  const fail = useCallback((): void => {
    setError(t("workspace.error.generic"));
  }, [t]);

  const loadProjects = useCallback(async (): Promise<ProjectDto[]> => {
    const list = await window.hub.projects.list();
    setProjects(list);
    return list;
  }, []);

  const loadConversations = useCallback(
    async (
      projectId: string | null,
      inboxImported = false,
    ): Promise<ConversationDto[]> => {
      const list = await window.hub.conversations.list(
        projectId === null
          ? { projectId: null, inbox: inboxImported ? "imported" : "avulsas" }
          : { projectId },
      );
      setConversations(list);
      return list;
    },
    [],
  );

  const loadMessages = useCallback(
    async (conversationId: string): Promise<MessageDto[]> => {
      const list = await window.hub.messages.list({ conversationId });
      setMessages(list);
      const labels = await window.hub.conversations.getBranchLabels({ conversationId });
      setBranchLabels(labels);
      return list;
    },
    [],
  );

  const loadPackets = useCallback(async (projectId: string | null): Promise<void> => {
    try {
      setPackets(await window.hub.packets.list({ projectId }));
    } catch {
      setPackets([]);
    }
  }, []);

  const loadKeys = useCallback(async (): Promise<ProviderKeyDto[]> => {
    const list = await window.hub.secrets.list();
    setProviderKeys(list);
    return list;
  }, []);

  const loadHealth = useCallback(async (): Promise<void> => {
    try {
      setHealth(await window.hub.health.summary());
    } catch {
      // Status bar stays on the last successful sample set.
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [projectList, keys, session, prefs, local] = await Promise.all([
          loadProjects(),
          loadKeys(),
          window.hub.settings.getSession(),
          window.hub.prefs.get(),
          window.hub.providers.localStatus(),
        ]);
        const matchingKey =
          keys.find(
            (item) =>
              item.status === "active" &&
              (item.providerSlug === "ollama"
                ? local.models.some((model) => model.id === session.model)
                : findCatalogModel(session.model, item.providerSlug) !== null),
          ) ??
          keys.find((item) => item.status === "active") ??
          null;
        setSelectedKeyId(matchingKey?.id ?? null);
        if (matchingKey?.providerSlug === "custom" || matchingKey?.providerSlug === "ollama") {
          setSelectedModel(session.model);
        } else if (
          matchingKey &&
          findCatalogModel(session.model, matchingKey.providerSlug)
        ) {
          setSelectedModel(session.model);
        } else if (matchingKey) {
          setSelectedModel(
            catalogModelsForProvider(matchingKey.providerSlug)[0]?.id ?? session.model,
          );
        }
        if (session.temperature !== undefined) {
          setTemperature(session.temperature);
        }
        if (session.maxTokens !== undefined) {
          setMaxTokens(session.maxTokens);
        }
        if (session.extraSystem !== undefined) {
          setExtraSystem(session.extraSystem);
        }
        setPrivacyMode(prefs.privacyMode);
        setAppPrefs(prefs);
        const showWizard = shouldShowOnboarding({
          hasProviderKey: keys.length > 0,
          onboardingComplete: prefs.onboardingComplete,
        });
        setShowOnboarding(showWizard);
        if (showWizard) {
          wizardStartedAt.current = Date.now();
        }
        if (!showWizard) {
          const created = await window.hub.conversations.create({
            projectId: null,
            title: t("workspace.untitledChat"),
          });
          setSelectedProjectId(null);
          setImportedInbox(false);
          await loadConversations(null, false);
          setSelectedConversationId(created.id);
          setMessages([]);
          setBranchLabels({});
          setSessionReady(true);
          return;
        }
        if (session.projectId) {
          const project =
            projectList.find((item) => item.id === session.projectId) ?? null;
          if (!project) {
            setSelectedProjectId(null);
            setImportedInbox(false);
            const convos = await loadConversations(null, false);
            const conversation =
              convos.find((item) => item.id === session.conversationId) ??
              convos[0] ??
              null;
            if (conversation) {
              setSelectedConversationId(conversation.id);
              await loadMessages(conversation.id);
            }
            setSessionReady(true);
            return;
          }
          setSelectedProjectId(project.id);
          setImportedInbox(false);
          const convos = await loadConversations(project.id, false);
          const conversation =
            convos.find((item) => item.id === session.conversationId) ??
            convos[0] ??
            null;
          if (conversation) {
            setSelectedConversationId(conversation.id);
            await loadMessages(conversation.id);
          }
        } else {
          setSelectedProjectId(null);
          const imported = session.importedInbox === true;
          setImportedInbox(imported);
          const convos = await loadConversations(null, imported);
          const conversation =
            convos.find((item) => item.id === session.conversationId) ??
            convos[0] ??
            null;
          if (conversation) {
            setSelectedConversationId(conversation.id);
            await loadMessages(conversation.id);
          }
        }
        setSessionReady(true);
      } catch {
        fail();
        setShowOnboarding(false);
        setSessionReady(true);
      }
    })();
  }, [fail, loadConversations, loadKeys, loadMessages, loadProjects, t]);

  useEffect(() => {
    void loadHealth();
    const handle = window.setInterval(() => {
      void loadHealth();
      void loadKeys();
    }, 8_000);
    return () => window.clearInterval(handle);
  }, [loadHealth, loadKeys]);

  useEffect(() => {
    void window.hub.costs
      .aggregate({
        conversationId: selectedConversationId,
        projectId: selectedProjectId,
      })
      .then(setCosts)
      .catch(() => setCosts(null));
  }, [messages, selectedConversationId, selectedProjectId]);

  useEffect(() => {
    void loadPackets(selectedProjectId);
  }, [loadPackets, selectedProjectId]);

  useEffect(() => {
    if (view !== "home" && view !== "settings") {
      return;
    }
    void window.hub.prefs
      .get()
      .then((prefs) => {
        setAppPrefs(prefs);
        setPrivacyMode(prefs.privacyMode);
      })
      .catch(() => {
        /* prefs refresh is best-effort */
      });
  }, [view]);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }
    void window.hub.settings
      .setSession({
        projectId: selectedProjectId,
        conversationId: selectedConversationId,
        model: selectedModel,
        temperature,
        maxTokens,
        extraSystem,
        importedInbox,
      })
      .catch(fail);
  }, [
    extraSystem,
    fail,
    importedInbox,
    maxTokens,
    selectedConversationId,
    selectedModel,
    selectedProjectId,
    sessionReady,
    temperature,
  ]);

  useEffect(() => {
    if (view !== "home" && view !== "prompts" && view !== "skills") {
      return;
    }
    void loadKeys()
      .then((list) => {
        setSelectedKeyId((current) => {
          if (current && list.some((item) => item.id === current)) {
            return current;
          }
          return list.find((item) => item.status === "active")?.id ?? null;
        });
      })
      .catch(fail);
  }, [fail, loadKeys, view]);

  useEffect(() => {
    const key = providerKeys.find((item) => item.id === selectedKeyId);
    if (!key || key.providerSlug === "custom" || key.providerSlug === "ollama") {
      return;
    }
    if (!findCatalogModel(selectedModel, key.providerSlug)) {
      const first = catalogModelsForProvider(key.providerSlug)[0];
      if (first) {
        setSelectedModel(first.id);
      }
    }
  }, [providerKeys, selectedKeyId, selectedModel]);

  useEffect(() => {
    selectedModelRef.current = selectedModel;
  }, [selectedModel]);

  useEffect(() => {
    setThreadStartModel(selectedModelRef.current);
    setCompactHistory(false);
  }, [selectedConversationId]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchHits([]);
      return;
    }
    const generation = searchGeneration.current + 1;
    searchGeneration.current = generation;
    const handle = window.setTimeout(() => {
      void window.hub.search
        .query({ query })
        .then((hits) => {
          if (searchGeneration.current === generation) {
            setSearchHits(hits);
          }
        })
        .catch(fail);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [fail, searchQuery]);

  const activePacketId =
    conversations.find((item) => item.id === selectedConversationId)?.activePacketId ??
    null;

  useEffect(() => {
    if (!selectedConversationId) {
      setPacketPreview(null);
      return;
    }
    const key = providerKeys.find((item) => item.id === selectedKeyId);
    if (!key) {
      setPacketPreview(null);
      return;
    }
    const extra = extraSystem.trim().length > 0 ? extraSystem : undefined;
    const pending = composerDraft.trim().length > 0 ? composerDraft.trim() : undefined;
    const handle = window.setTimeout(() => {
      void window.hub.chat
        .previewPacket({
          conversationId: selectedConversationId,
          model: selectedModel,
          providerSlug: key.providerSlug,
          compact: compactHistory,
          privacyMode,
          ...(extra !== undefined ? { extraSystem: extra } : {}),
          ...(pending !== undefined ? { pendingContent: pending } : {}),
          ...(maxTokens !== null ? { maxTokens } : {}),
          ...fileIdsPayload(attachedFiles),
          ...mentionsPayload(mentionRefs),
        })
        .then(setPacketPreview)
        .catch(fail);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [
    compactHistory,
    composerDraft,
    extraSystem,
    fail,
    maxTokens,
    messages,
    providerKeys,
    selectedConversationId,
    selectedKeyId,
    selectedModel,
    privacyMode,
    activePacketId,
    attachedFiles,
    mentionRefs,
  ]);

  useEffect(() => {
    const off = window.hub.chat.onEvent((event) => {
      if (event.type === "chunk") {
        if (wizardStartedAt.current !== null) {
          const elapsed = Date.now() - wizardStartedAt.current;
          wizardStartedAt.current = null;
          void window.hub.prefs.set({ lastWizardTtftMs: elapsed }).catch(() => {
            // Prefs are best-effort telemetry for the 90s budget.
          });
          if (elapsed > WIZARD_TTFT_BUDGET_MS) {
            console.warn("[hub:wizard-ttft]", elapsed);
          } else {
            console.info("[hub:wizard-ttft]", elapsed);
          }
        }
        setMessages((current) =>
          current.map((message) =>
            message.id === event.messageId
              ? { ...message, content: message.content + event.text, status: "streaming" }
              : message,
          ),
        );
        return;
      }
      if (event.type === "usage") {
        setRun((current) => current?.runId === event.runId ? { ...current, tokensIn: event.tokensIn, tokensOut: event.tokensOut, tokensThinking: event.tokensThinking, cacheReadTokens: event.cacheReadTokens, cacheWriteTokens: event.cacheWriteTokens, costUsd: event.costUsd, thinkingSupported: event.thinkingSupported } : current);
        return;
      }
      if (event.type === "done") {
        setMessages((current) =>
          current.map((message) =>
            message.id === event.message.id ? event.message : message,
          ),
        );
        setRun((current) => (current?.runId === event.runId ? null : current));
        void loadHealth();
        return;
      }
      setRun((current) => (current?.runId === event.runId ? null : current));
      if (event.code !== "aborted") {
        setError(chatEventErrorText(t, event.code));
        setShowAllowOnce(false);
        if (event.suggestKeyId && event.suggestProviderSlug && event.suggestModel) {
          const failed =
            providerKeys.find((item) => item.id === selectedKeyId)?.providerSlug ??
            event.suggestProviderSlug;
          setFallback({
            messageId: event.messageId,
            code: event.code,
            failedProvider: failed,
            suggestProviderSlug: event.suggestProviderSlug,
            suggestKeyId: event.suggestKeyId,
            suggestModel: event.suggestModel,
          });
        }
      }
      void loadHealth();
      setSelectedConversationId((conversationId) => {
        if (conversationId) {
          void loadMessages(conversationId).catch(fail);
        }
        return conversationId;
      });
    });
    return off;
  }, [fail, loadHealth, loadMessages, providerKeys, selectedKeyId, t]);

  useEffect(() => {
    if (!fallback || !selectedConversationId) {
      setFallbackPreview(null);
      return;
    }
    const extra = extraSystem.trim().length > 0 ? extraSystem : undefined;
    void window.hub.chat
      .previewPacket({
        conversationId: selectedConversationId,
        model: fallback.suggestModel,
        providerSlug: fallback.suggestProviderSlug,
        compact: compactHistory,
        privacyMode,
        ...(extra !== undefined ? { extraSystem: extra } : {}),
        ...(maxTokens !== null ? { maxTokens } : {}),
        ...fileIdsPayload(attachedFiles),
        ...mentionsPayload(mentionRefs),
      })
      .then(setFallbackPreview)
      .catch(() => setFallbackPreview(null));
  }, [
    attachedFiles,
    compactHistory,
    extraSystem,
    fallback,
    maxTokens,
    mentionRefs,
    privacyMode,
    selectedConversationId,
  ]);

  const applyProjectPreferences = useCallback(
    (project: ProjectDto, keys: ProviderKeyDto[]): void => {
      if (project.preferredProvider) {
        const key = keys.find(
          (item) =>
            item.status === "active" && item.providerSlug === project.preferredProvider,
        );
        if (!key) {
          return;
        }
        setSelectedKeyId(key.id);
        if (project.preferredModel) {
          setSelectedModel(project.preferredModel);
        }
        return;
      }
      if (project.preferredModel) {
        setSelectedModel(project.preferredModel);
      }
    },
    [],
  );

  const createUntitledChat = useCallback(async (): Promise<void> => {
    try {
      const created = await window.hub.conversations.create({
        projectId: selectedProjectId,
        title: t("workspace.untitledChat"),
      });
      setError(null);
      setImportedInbox(false);
      await loadConversations(selectedProjectId, false);
      setSelectedConversationId(created.id);
      setMessages([]);
      setBranchLabels({});
      if (run && run.conversationId !== created.id) {
        void window.hub.chat.abort({ runId: run.runId }).catch(fail);
      }
      setView("home");
    } catch {
      fail();
    }
  }, [fail, loadConversations, run, selectedProjectId, t]);

  const sendToModel = async (input: ChatSendInput): Promise<boolean> => {
    if (!selectedConversationId || !selectedKeyId) {
      return false;
    }
    lastSendRef.current = input;
    setSending(true);
    try {
      const result = await window.hub.chat.send({
        ...input,
        compactHistory,
        privacyMode,
      });
      setError(null);
      setShowAllowOnce(false);
      setFallback(null);
      setRun({ runId: result.runId, conversationId: selectedConversationId, tokensIn: null, tokensOut: null, tokensThinking: null, cacheReadTokens: null, cacheWriteTokens: null, costUsd: null, thinkingSupported: null });
      setMessages((current) => applySendResult(current, result));
      const conversation = conversations.find((item) => item.id === selectedConversationId);
      const generatedTitle =
        input.mode === "send" && input.content ? titleFromFirstPrompt(input.content) : null;
      if (conversation?.title === t("workspace.untitledChat") && generatedTitle) {
        void window.hub.conversations
          .rename({ conversationId: conversation.id, title: generatedTitle })
          .then((updated) =>
            setConversations((current) =>
              current.map((item) => (item.id === updated.id ? updated : item)),
            ),
          )
          .catch(() => undefined);
      }
      return true;
    } catch (error) {
      const mapped = workspaceErrorText(t, error);
      setError(mapped.text);
      setShowAllowOnce(mapped.cap);
      return false;
    } finally {
      setSending(false);
    }
  };

  const abortIfLeaving = useCallback(
    (nextConversationId: string | null): void => {
      if (run && run.conversationId !== nextConversationId) {
        void window.hub.chat.abort({ runId: run.runId }).catch(fail);
      }
    },
    [fail, run],
  );

  const navigateToView = useCallback(
    (next: AppView): void => {
      if (next !== "home") {
        abortIfLeaving(null);
      }
      setView(next);
    },
    [abortIfLeaving],
  );

  const openSettings = useCallback(
    (section: SettingsSection): void => {
      setSettingsSection(section);
      navigateToView("settings");
    },
    [navigateToView],
  );

  const selectProject = useCallback(
    (id: string | null): void => {
      abortIfLeaving(null);
      setSelectedProjectId(id);
      setImportedInbox(false);
      setAttachedFiles([]);
      setMentionRefs([]);
      setSelectedConversationId(null);
      setMessages([]);
      setBranchLabels({});
      if (id) {
        const next = projects.find((item) => item.id === id);
        if (next) {
          applyProjectPreferences(next, providerKeys);
        }
      }
      void loadConversations(id, false).catch(fail);
      setView("home");
    },
    [
      abortIfLeaving,
      applyProjectPreferences,
      fail,
      loadConversations,
      projects,
      providerKeys,
    ],
  );

  const openSearchHit = useCallback(
    (hit: SearchHit): void => {
      if (hit.kind === "note") {
        setSelectedProjectId(hit.projectId);
        setView("home");
        setSearchQuery("");
        setSearchHits([]);
        return;
      }
      if (!hit.conversationId) {
        return;
      }
      const conversationId = hit.conversationId;
      abortIfLeaving(conversationId);
      setSelectedProjectId(hit.projectId);
      setView("home");
      void (async () => {
        try {
          let convos = await loadConversations(hit.projectId, false);
          let imported = false;
          if (
            hit.projectId === null &&
            !convos.some((item) => item.id === conversationId)
          ) {
            convos = await loadConversations(null, true);
            imported = true;
          }
          setImportedInbox(imported);
          setSelectedConversationId(conversationId);
          await loadMessages(conversationId);
          if (hit.messageId) {
            await window.hub.messages.activate({ id: hit.messageId });
            await loadMessages(conversationId);
          }
          setSearchQuery("");
          setSearchHits([]);
        } catch {
          fail();
        }
      })();
    },
    [abortIfLeaving, fail, loadConversations, loadMessages],
  );

  const exportConversation = useCallback(
    async (mode: "active" | "tree"): Promise<void> => {
      if (!selectedConversationId) {
        return;
      }
      try {
        const result = await window.hub.conversations.export({
          conversationId: selectedConversationId,
          mode,
        });
        if (result.status === "saved") {
          const parts = result.path.split(/[/\\]/);
          const name = parts[parts.length - 1] ?? result.path;
          setExportNotice(t("workspace.export.saved", { path: name }));
        } else {
          setExportNotice(null);
        }
      } catch {
        fail();
      }
    },
    [fail, selectedConversationId, t],
  );

  const searchWorkspace = useCallback((query: string): Promise<SearchHit[]> => {
    return window.hub.search.query({ query });
  }, []);

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) {
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (event.shiftKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setView("home");
        window.setTimeout(() => projectInputRef.current?.focus(), 0);
        return;
      }
      if (event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        navigateToView("skills");
        return;
      }
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        void createUntitledChat();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createUntitledChat, navigateToView]);

  if (showOnboarding === null) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <TitleBar />
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <TitleBar />
        <OnboardingView
          onComplete={(key) => {
            const models = catalogModelsForProvider(key.providerSlug);
            const nextModel = models[0]?.id ?? selectedModel;
            setSelectedKeyId(key.id);
            setSelectedModel(nextModel);
            void window.hub.prefs
              .set({ onboardingComplete: true })
              .then(async () => {
                await loadKeys();
                setShowOnboarding(false);
                await createUntitledChat();
              })
              .catch(fail);
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-canvas flex h-full flex-col overflow-hidden">
      <TitleBar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
          view={view}
          onChange={navigateToView}
          projects={projects}
          selectedProjectId={selectedProjectId}
          importedInbox={importedInbox}
          onSelectProject={selectProject}
          onSelectImportedInbox={() => {
            abortIfLeaving(null);
            setSelectedProjectId(null);
            setAttachedFiles([]);
      setMentionRefs([]);
            setImportedInbox(true);
            setSelectedConversationId(null);
            setMessages([]);
            setBranchLabels({});
            void loadConversations(null, true).catch(fail);
          }}
          onCreateProject={async (name) => {
            try {
              const created = await window.hub.projects.create({ name });
              setError(null);
              const list = await loadProjects();
              const next = list.find((item) => item.id === created.id) ?? created;
              setSelectedProjectId(next.id);
              setImportedInbox(false);
              setSelectedConversationId(null);
              setMessages([]);
              setBranchLabels({});
              abortIfLeaving(null);
              await loadConversations(next.id, false);
              setView("home");
            } catch {
              fail();
            }
          }}
          projectInputRef={projectInputRef}
          searchQuery={searchQuery}
          searchHits={searchHits}
          onSearchQuery={setSearchQuery}
          searchInputRef={searchInputRef}
          onOpenSearchHit={openSearchHit}
        />
        <main className="min-w-0 flex-1 overflow-hidden">
          <div key={view} className="view-transition h-full">
          {view === "home" ? (
            <HomeView
              project={selectedProject}
              importedInbox={importedInbox}
              projects={projects}
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              messages={messages}
              error={error}
              providerKeys={providerKeys}
              health={health}
              selectedKeyId={selectedKeyId}
              selectedModel={selectedModel}
              temperature={temperature}
              maxTokens={maxTokens}
              extraSystem={extraSystem}
              streaming={run?.conversationId === selectedConversationId}
              sending={sending || activating}
              runHud={run}
              branchLabels={branchLabels}
              exportNotice={exportNotice}
              onSelectConversation={(id) => {
                abortIfLeaving(id);
                setSelectedConversationId(id);
                void loadMessages(id).catch(fail);
              }}
              onCreateConversation={async (title) => {
                try {
                  const created = await window.hub.conversations.create({
                    projectId: selectedProjectId,
                    title,
                  });
                  setError(null);
                  await loadConversations(selectedProjectId, importedInbox);
                  setSelectedConversationId(created.id);
                  setMessages([]);
                  setBranchLabels({});
                  abortIfLeaving(created.id);
                } catch {
                  fail();
                }
              }}
              onSelectKey={setSelectedKeyId}
              onSelectModel={setSelectedModel}
              onSelectTemperature={setTemperature}
              onSelectMaxTokens={setMaxTokens}
              onSelectExtraSystem={setExtraSystem}
              onSend={async (content, mentions, route) => {
                const routeKeyId = route?.keyId ?? selectedKeyId;
                if (!selectedConversationId || !routeKeyId) {
                  return false;
                }
                let nextMentions = mentions;
                let model = route?.model ?? selectedModel;
                const providerKeyId = routeKeyId;
                const skillRef = mentions.find((item) => item.type === "skill");
                if (skillRef) {
                  try {
                    const resolved = await window.hub.skills.resolve({
                      projectId: selectedProjectId,
                      privacyMode,
                      ...(skillRef.id !== undefined ? { skillId: skillRef.id } : {}),
                      ...(skillRef.query !== undefined ? { query: skillRef.query } : {}),
                    });
                    nextMentions = [
                      ...resolved.defaultMentions.map((item) => ({
                        type: item.type,
                        query: item.query,
                      })),
                      ...mentions,
                    ].slice(0, 8);
                    if (resolved.preferredModel) {
                      const sessionKey = providerKeys.find((key) => key.id === selectedKeyId);
                      if (
                        sessionKey &&
                        catalogModelsForProvider(sessionKey.providerSlug).some(
                          (item) => item.id === resolved.preferredModel,
                        )
                      ) {
                        model = resolved.preferredModel;
                        setSelectedModel(model);
                      }
                    }
                  } catch {
                    fail();
                    return false;
                  }
                }
                setMentionRefs(nextMentions);
                return sendToModel({
                  mode: "send",
                  conversationId: selectedConversationId,
                  providerKeyId,
                  model,
                  content,
                  temperature,
                  maxTokens,
                  ...(route ? { runMode: route.runMode, effortLevel: route.effortLevel } : {}),
                  extraSystem,
                  compactHistory,
                  ...fileIdsPayload(attachedFiles),
                  ...mentionsPayload(nextMentions),
                });
              }}
              onMentionsChange={setMentionRefs}
              onAbort={async () => {
                if (!run || run.conversationId !== selectedConversationId) {
                  return;
                }
                try {
                  await window.hub.chat.abort({ runId: run.runId });
                } catch {
                  fail();
                }
              }}
              appPrefs={appPrefs}
              onAppPrefsPatch={async (patch) => {
                try {
                  const next = await window.hub.prefs.set(patch);
                  setAppPrefs(next);
                  setPrivacyMode(next.privacyMode);
                } catch {
                  fail();
                }
              }}
              onRegenerate={async (messageId) => {
                if (!selectedConversationId || !selectedKeyId) {
                  return;
                }
                await sendToModel({
                  mode: "regenerate",
                  conversationId: selectedConversationId,
                  providerKeyId: selectedKeyId,
                  model: selectedModel,
                  messageId,
                  temperature,
                  maxTokens,
                  extraSystem,
                  ...fileIdsPayload(attachedFiles),
                });
              }}
              onContinue={async () => {
                if (!selectedConversationId || !selectedKeyId) {
                  return;
                }
                await sendToModel({
                  mode: "continue",
                  conversationId: selectedConversationId,
                  providerKeyId: selectedKeyId,
                  model: selectedModel,
                  temperature,
                  maxTokens,
                  extraSystem,
                  ...fileIdsPayload(attachedFiles),
                });
              }}
              onEditUser={async (id, content) => {
                if (!selectedConversationId || !selectedKeyId) {
                  return;
                }
                await sendToModel({
                  mode: "edit",
                  conversationId: selectedConversationId,
                  providerKeyId: selectedKeyId,
                  model: selectedModel,
                  messageId: id,
                  content,
                  temperature,
                  maxTokens,
                  extraSystem,
                  ...fileIdsPayload(attachedFiles),
                });
              }}
              onActivate={async (id) => {
                setActivating(true);
                try {
                  await window.hub.messages.activate({ id });
                  if (selectedConversationId) {
                    await loadMessages(selectedConversationId);
                  }
                } catch {
                  fail();
                } finally {
                  setActivating(false);
                }
              }}
              onRenameBranch={async (branchId, label) => {
                if (!selectedConversationId) {
                  return;
                }
                try {
                  await window.hub.conversations.setBranchLabel({
                    conversationId: selectedConversationId,
                    branchId,
                    label,
                  });
                  setBranchLabels(
                    await window.hub.conversations.getBranchLabels({
                      conversationId: selectedConversationId,
                    }),
                  );
                } catch {
                  fail();
                }
              }}
              onExport={exportConversation}
              onDuplicateConversation={async (conversationId) => {
                try {
                  const copy = await window.hub.conversations.duplicate({ id: conversationId });
                  setError(null);
                  await loadConversations(selectedProjectId, importedInbox);
                  setSelectedConversationId(copy.id);
                  await loadMessages(copy.id);
                } catch {
                  fail();
                }
              }}
              onRemoveConversation={async (conversationId) => {
                try {
                  const deletingSelected = selectedConversationId === conversationId;
                  if (deletingSelected) {
                    abortIfLeaving(null);
                  }
                  await window.hub.conversations.remove({ id: conversationId });
                  setError(null);
                  const list = await loadConversations(selectedProjectId, importedInbox);
                  if (!deletingSelected) {
                    return;
                  }
                  const next = list[0] ?? null;
                  setSelectedConversationId(next?.id ?? null);
                  if (next) {
                    await loadMessages(next.id);
                  } else {
                    setMessages([]);
                    setBranchLabels({});
                  }
                } catch {
                  fail();
                }
              }}
              onPromoteConversation={async () => {
                if (!selectedConversationId) {
                  return;
                }
                try {
                  const result = await window.hub.conversations.toProject({ id: selectedConversationId });
                  setError(null);
                  await loadProjects();
                  setSelectedProjectId(result.project.id);
                  setImportedInbox(false);
                  await loadConversations(result.project.id, false);
                  setSelectedConversationId(result.conversation.id);
                  await loadMessages(result.conversation.id);
                } catch {
                  fail();
                }
              }}
              onMoveConversation={async (projectId) => {
                if (!selectedConversationId) {
                  return;
                }
                try {
                  const moved = await window.hub.conversations.move({
                    conversationId: selectedConversationId,
                    projectId,
                  });
                  setError(null);
                  if (projectId) {
                    setSelectedProjectId(projectId);
                    setImportedInbox(false);
                    await loadConversations(projectId, false);
                  } else {
                    setSelectedProjectId(null);
                    setImportedInbox(true);
                    await loadConversations(null, true);
                  }
                  setConversations((current) => {
                    if (current.some((item) => item.id === moved.id)) {
                      return current.map((item) => (item.id === moved.id ? moved : item));
                    }
                    return current;
                  });
                } catch {
                  fail();
                }
              }}
              onSaveProject={async (input: Omit<ProjectUpdateInput, "id">) => {
                if (!selectedProjectId) {
                  return;
                }
                try {
                  const updated = await window.hub.projects.update({
                    id: selectedProjectId,
                    ...input,
                  });
                  setError(null);
                  await loadProjects();
                  applyProjectPreferences(updated, providerKeys);
                } catch {
                  fail();
                }
              }}
              onRemoveProject={async () => {
                if (!selectedProjectId) {
                  return;
                }
                const leaving = conversations.find(
                  (item) => item.id === selectedConversationId,
                );
                const imported = leaving?.importSource != null;
                try {
                  abortIfLeaving(null);
                  await window.hub.projects.remove({ id: selectedProjectId });
                  setError(null);
                  await loadProjects();
                  setSelectedProjectId(null);
                  setImportedInbox(imported);
                  setSelectedConversationId(null);
                  setMessages([]);
                  setBranchLabels({});
                  await loadConversations(null, imported);
                } catch {
                  fail();
                }
              }}
              onSetTags={async (names) => {
                if (!selectedConversationId) {
                  return;
                }
                try {
                  const updated = await window.hub.conversations.setTags({
                    conversationId: selectedConversationId,
                    names,
                  });
                  setConversations((current) =>
                    current.map((item) => (item.id === updated.id ? updated : item)),
                  );
                } catch {
                  fail();
                }
              }}
              compactHistory={compactHistory}
              onToggleCompact={setCompactHistory}
              packetPreview={packetPreview}
              modelSwitchNotice={
                threadStartModel !== null &&
                threadStartModel !== selectedModel &&
                messages.length > 0
              }
              conversationCost={costs?.conversationUsd ?? null}
              projectCost={costs?.projectUsd ?? null}
              showAllowOnce={showAllowOnce}
              onAllowOnce={() => {
                const pending = lastSendRef.current;
                if (!pending) {
                  return;
                }
                void sendToModel({ ...pending, allowOnce: true });
              }}
              onComposerDraft={reportComposerDraft}
              composerInsert={composerInsert}
              onComposerInsertConsumed={() => setComposerInsert(null)}
              pendingSkill={pendingSkill}
              onPendingSkillConsumed={() => setPendingSkill(null)}
              onOpenSkills={() => navigateToView("skills")}
              onPin={async (id, pinned) => {
                try {
                  const updated = await window.hub.messages.pin({ id, pinned });
                  setMessages((current) =>
                    current.map((item) => (item.id === updated.id ? updated : item)),
                  );
                } catch {
                  fail();
                }
              }}
              packets={packets}
              privacyMode={privacyMode}
              onPrivacyMode={(value) => {
                setPrivacyMode(value);
                if (value === "private" || value === "normal" || value === "maximum") {
                  void window.hub.prefs.set({ privacyMode: value });
                }
              }}
              onCompilePacket={async () => {
                if (!selectedConversationId) {
                  return;
                }
                const key = providerKeys.find((item) => item.id === selectedKeyId);
                const extra = extraSystem.trim().length > 0 ? extraSystem : undefined;
                try {
                  await window.hub.packets.compile({
                    conversationId: selectedConversationId,
                    compact: compactHistory,
                    privacyMode,
                    ...(key
                      ? { model: selectedModel, providerSlug: key.providerSlug }
                      : {}),
                    ...(extra !== undefined ? { extraSystem: extra } : {}),
                  });
                  await loadPackets(selectedProjectId);
                  setExportNotice(t("workspace.packet.savedNotice"));
                } catch {
                  fail();
                }
              }}
              onExportPacket={async (packetId) => {
                try {
                  const result = await window.hub.packets.export({ packetId });
                  setExportNotice(
                    result.status === "saved"
                      ? t("workspace.packet.exported")
                      : t("workspace.packet.cancelled"),
                  );
                } catch {
                  fail();
                }
              }}
              onImportPacket={async () => {
                if (!selectedProjectId) {
                  return;
                }
                try {
                  const picked = await window.hub.packets.pickFile();
                  if (picked.status !== "picked") {
                    setExportNotice(t("workspace.packet.cancelled"));
                    return;
                  }
                  await window.hub.packets.import({
                    ticket: picked.ticket,
                    projectId: selectedProjectId,
                  });
                  await loadPackets(selectedProjectId);
                  setExportNotice(t("workspace.packet.imported"));
                } catch {
                  fail();
                }
              }}
              onApplyPacket={async (packetId) => {
                if (!selectedConversationId) {
                  return;
                }
                try {
                  const updated = await window.hub.packets.apply({
                    conversationId: selectedConversationId,
                    packetId,
                  });
                  setConversations((current) =>
                    current.map((item) => (item.id === updated.id ? updated : item)),
                  );
                  setExportNotice(t("workspace.packet.appliedNotice"));
                } catch {
                  fail();
                }
              }}
              onClearPacket={async () => {
                if (!selectedConversationId) {
                  return;
                }
                try {
                  const updated = await window.hub.packets.clear({
                    conversationId: selectedConversationId,
                  });
                  setConversations((current) =>
                    current.map((item) => (item.id === updated.id ? updated : item)),
                  );
                  setExportNotice(t("workspace.packet.cleared"));
                } catch {
                  fail();
                }
              }}
              onOpenCaps={() => openSettings("caps")}
              attachedFiles={attachedFiles}
              onAttachFile={async () => {
                try {
                  const created = await window.hub.files.attach({
                    projectId: selectedProjectId,
                    kind: "file",
                  });
                  setAttachedFiles((current) =>
                    [...current, ...created.filter((item) => !current.some((row) => row.id === item.id))].slice(
                      0,
                      8,
                    ),
                  );
                  setError(null);
                } catch (error) {
                  const mapped = workspaceErrorText(t, error);
                  setError(mapped.text);
                }
              }}
              onAttachFolder={async () => {
                try {
                  const created = await window.hub.files.attach({
                    projectId: selectedProjectId,
                    kind: "folder",
                  });
                  setAttachedFiles((current) =>
                    [...current, ...created.filter((item) => !current.some((row) => row.id === item.id))].slice(
                      0,
                      8,
                    ),
                  );
                  setError(null);
                } catch (error) {
                  const mapped = workspaceErrorText(t, error);
                  setError(mapped.text);
                }
              }}
              onRemoveFile={async (id) => {
                setAttachedFiles((current) => current.filter((item) => item.id !== id));
              }}
              onDropFiles={async (files) => {
                try {
                  const created = await window.hub.files.fromDrop({
                    projectId: selectedProjectId,
                    files,
                  });
                  setAttachedFiles((current) =>
                    [...current, ...created.filter((item) => !current.some((row) => row.id === item.id))].slice(
                      0,
                      8,
                    ),
                  );
                  setError(null);
                } catch (error) {
                  const mapped = workspaceErrorText(t, error);
                  setError(mapped.text);
                }
              }}
            />
          ) : view === "debug" ? (
            <DebugView />
          ) : view === "prompts" ? (
            <PromptsView
              project={selectedProject}
              providerKeys={providerKeys}
              privacyMode={privacyMode}
              conversationId={selectedConversationId}
              health={health}
              onInsertIntoComposer={(text) => {
                setComposerInsert(text);
                setView("home");
              }}
            />
          ) : view === "skills" ? (
            <SkillsView
              onRunSkill={(input) => {
                setPendingSkill(input);
                setView("home");
              }}
            />
          ) : view === "import" ? (
            <ImportView
              projects={projects}
              onImported={(destination) => {
                setSelectedProjectId(destination.projectId);
                setImportedInbox(destination.importedInbox);
                setView("home");
                void loadConversations(destination.projectId, destination.importedInbox)
                  .then(async (list) => {
                    const first = list[0];
                    if (!first) {
                      setSelectedConversationId(null);
                      setMessages([]);
                      return;
                    }
                    setSelectedConversationId(first.id);
                    await loadMessages(first.id);
                  })
                  .catch(fail);
              }}
            />
          ) : (
            <SettingsView focusSection={settingsSection} />
          )}
          </div>
        </main>
      </div>
      <StatusBar health={health} runHud={run} onOpenShortcuts={() => setShortcutsOpen(true)} />
      <Dialog
        open={fallback !== null}
        onOpenChange={(open) => {
          if (!open) {
            setFallback(null);
            setFallbackPreview(null);
          }
        }}
      >
        <DialogContent data-testid="fallback-dialog">
          <DialogHeader>
            <DialogTitle>{t("fallback.title")}</DialogTitle>
          </DialogHeader>
          {fallback ? (
            <>
              <p className="text-[13px]">
                {t("fallback.body", {
                  failed: fallback.failedProvider,
                  code: fallback.code,
                  suggested: fallback.suggestProviderSlug,
                })}
              </p>
              {fallbackPreview?.estimatedCostUsd ? (
                <p
                  className="text-[12px] text-muted-foreground"
                  data-testid="fallback-estimate"
                >
                  {t("fallback.estimate", {
                    usd: fallbackPreview.estimatedCostUsd,
                    suggested: fallback.suggestProviderSlug,
                  })}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button
                  type="button"
                  data-testid="fallback-confirm"
                  onClick={() => {
                    const pending = fallback;
                    if (!selectedConversationId) {
                      return;
                    }
                    setFallback(null);
                    setSelectedKeyId(pending.suggestKeyId);
                    setSelectedModel(pending.suggestModel);
                    void sendToModel({
                      mode: "regenerate",
                      conversationId: selectedConversationId,
                      providerKeyId: pending.suggestKeyId,
                      model: pending.suggestModel,
                      messageId: pending.messageId,
                      temperature,
                      maxTokens,
                      extraSystem,
                      ...fileIdsPayload(attachedFiles),
                    });
                  }}
                >
                  {t("fallback.confirm", { suggested: fallback.suggestProviderSlug })}
                </Button>
                <Button type="button" variant="outline" onClick={() => setFallback(null)}>
                  {t("fallback.dismiss")}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <ChromeCommandPalette
        projects={projects}
        providerKeys={providerKeys}
        selectedModel={selectedModel}
        selectedConversationId={selectedConversationId}
        busy={sending || run !== null}
        onNewProject={() => {
          navigateToView("home");
          window.setTimeout(() => projectInputRef.current?.focus(), 0);
        }}
        onNewChat={() => {
          void createUntitledChat();
        }}
        onOpenInbox={() => selectProject(null)}
        onOpenImportedInbox={() => {
          abortIfLeaving(null);
          setSelectedProjectId(null);
          setImportedInbox(true);
          setSelectedConversationId(null);
          setMessages([]);
          setBranchLabels({});
          void loadConversations(null, true).catch(fail);
          setView("home");
        }}
        onOpenProject={(projectId) => selectProject(projectId)}
        onOpenSearchHit={openSearchHit}
        onSearchWorkspace={searchWorkspace}
        onSelectModel={(option: PaletteModelOption) => {
          setSelectedKeyId(option.keyId);
          setSelectedModel(option.modelId);
          navigateToView("home");
        }}
        onExport={(mode) => {
          void exportConversation(mode);
        }}
        onProviders={() => openSettings("providers")}
        onSettings={() => openSettings("general")}
        onDebug={() => navigateToView("debug")}
        onImport={() => navigateToView("import")}
        onPrompts={() => navigateToView("prompts")}
        onSkills={() => navigateToView("skills")}
        onRunSkill={(query) => {
          setPendingSkill({ query });
          navigateToView("home");
        }}
        onShortcuts={() => setShortcutsOpen(true)}
      />
    </div>
  );
}
