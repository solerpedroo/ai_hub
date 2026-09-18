import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type {
  BranchLabels,
  ChatSendInput,
  ChatSendResult,
  ConversationDto,
  CostsAggregateResult,
  GatewayErrorCode,
  HealthSummaryDto,
  MessageDto,
  PacketPreviewResult,
  ProjectDto,
  ProjectUpdateInput,
  ProviderKeyDto,
  SearchHit,
} from "@ai-hub/shared";
import {
  catalogModelsForProvider,
  classifyHubIpcError,
  findCatalogModel,
  upsertActivated,
} from "@ai-hub/shared";
import { TitleBar } from "@/components/layout/title-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { StatusBar } from "@/components/layout/status-bar";
import { HomeView } from "@/components/layout/home-view";
import { SettingsView } from "@/components/layout/settings-view";
import { DebugView } from "@/components/layout/debug-view";
import { ChromeCommandPalette } from "@/components/layout/command-palette";
import type { AppView } from "@/components/layout/types";
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

function workspaceErrorText(t: TFunction, error: unknown): { text: string; cap: boolean } {
  const message = error instanceof Error ? error.message : String(error);
  const classified = classifyHubIpcError(message);
  if (classified.kind === "cap" && classified.scope) {
    return { text: t("workspace.error.cap", { scope: t(`caps.scope.${classified.scope}`) }), cap: true };
  }
  if (classified.kind === "unknown_model") {
    return { text: t("workspace.error.unknownModel"), cap: false };
  }
  if (classified.kind === "gateway" && classified.code && GATEWAY_ERROR_KEYS.has(classified.code)) {
    return { text: t(`workspace.error.${classified.code}`), cap: false };
  }
  return { text: t("workspace.error.generic"), cap: false };
}

function chatEventErrorText(t: TFunction, code: GatewayErrorCode): string {
  if (GATEWAY_ERROR_KEYS.has(code)) {
    return t(`workspace.error.${code}`);
  }
  return t("workspace.error.chat", { code });
}

export function App(): JSX.Element {
  const { t } = useTranslation();
  const [view, setView] = useState<AppView>("home");
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [providerKeys, setProviderKeys] = useState<ProviderKeyDto[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [temperature, setTemperature] = useState(1);
  const [maxTokens, setMaxTokens] = useState<number | null>(null);
  const [extraSystem, setExtraSystem] = useState("");
  const [run, setRun] = useState<{ runId: string; conversationId: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [activating, setActivating] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchLabels, setBranchLabels] = useState<BranchLabels>({});
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [compactHistory, setCompactHistory] = useState(false);
  const [packetPreview, setPacketPreview] = useState<PacketPreviewResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [threadStartModel, setThreadStartModel] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthSummaryDto[]>([]);
  const [costs, setCosts] = useState<CostsAggregateResult | null>(null);
  const [showAllowOnce, setShowAllowOnce] = useState(false);
  const [composerDraft, setComposerDraft] = useState("");
  const [fallback, setFallback] = useState<{
    messageId: string;
    code: GatewayErrorCode;
    failedProvider: string;
    suggestProviderSlug: string;
    suggestKeyId: string;
    suggestModel: string;
  } | null>(null);
  const [fallbackPreview, setFallbackPreview] = useState<PacketPreviewResult | null>(null);
  const projectInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const selectedModelRef = useRef(selectedModel);
  const searchGeneration = useRef(0);
  const lastSendRef = useRef<ChatSendInput | null>(null);

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

  const loadConversations = useCallback(async (projectId: string | null): Promise<ConversationDto[]> => {
    const list = await window.hub.conversations.list({ projectId });
    setConversations(list);
    return list;
  }, []);

  const loadMessages = useCallback(async (conversationId: string): Promise<MessageDto[]> => {
    const list = await window.hub.messages.list({ conversationId });
    setMessages(list);
    const labels = await window.hub.conversations.getBranchLabels({ conversationId });
    setBranchLabels(labels);
    return list;
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
        const [projectList, keys, session] = await Promise.all([
          loadProjects(),
          loadKeys(),
          window.hub.settings.getSession(),
        ]);
        const matchingKey =
          keys.find(
            (item) => item.status === "active" && findCatalogModel(session.model, item.providerSlug) !== null,
          ) ??
          keys.find((item) => item.status === "active") ??
          null;
        setSelectedKeyId(matchingKey?.id ?? null);
        if (matchingKey?.providerSlug === "custom") {
          setSelectedModel(session.model);
        } else if (matchingKey && findCatalogModel(session.model, matchingKey.providerSlug)) {
          setSelectedModel(session.model);
        } else if (matchingKey) {
          setSelectedModel(catalogModelsForProvider(matchingKey.providerSlug)[0]?.id ?? session.model);
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
        if (session.projectId) {
          const project = projectList.find((item) => item.id === session.projectId) ?? null;
          if (!project) {
            setSelectedProjectId(null);
            const convos = await loadConversations(null);
            const conversation =
              convos.find((item) => item.id === session.conversationId) ?? convos[0] ?? null;
            if (conversation) {
              setSelectedConversationId(conversation.id);
              await loadMessages(conversation.id);
            }
            setSessionReady(true);
            return;
          }
          setSelectedProjectId(project.id);
          const convos = await loadConversations(project.id);
          const conversation =
            convos.find((item) => item.id === session.conversationId) ?? convos[0] ?? null;
          if (conversation) {
            setSelectedConversationId(conversation.id);
            await loadMessages(conversation.id);
          }
        } else {
          setSelectedProjectId(null);
          const convos = await loadConversations(null);
          const conversation =
            convos.find((item) => item.id === session.conversationId) ?? convos[0] ?? null;
          if (conversation) {
            setSelectedConversationId(conversation.id);
            await loadMessages(conversation.id);
          }
        }
        setSessionReady(true);
      } catch {
        fail();
        setSessionReady(true);
      }
    })();
  }, [fail, loadConversations, loadKeys, loadMessages, loadProjects]);

  useEffect(() => {
    void loadHealth();
    const handle = window.setInterval(() => {
      void loadHealth();
    }, 8_000);
    return () => window.clearInterval(handle);
  }, [loadHealth]);

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
      })
      .catch(fail);
  }, [extraSystem, fail, maxTokens, selectedConversationId, selectedModel, selectedProjectId, sessionReady, temperature]);

  useEffect(() => {
    if (view !== "home") {
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
    if (!key || key.providerSlug === "custom") {
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
          ...(extra !== undefined ? { extraSystem: extra } : {}),
          ...(pending !== undefined ? { pendingContent: pending } : {}),
          ...(maxTokens !== null ? { maxTokens } : {}),
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
  ]);

  useEffect(() => {
    const off = window.hub.chat.onEvent((event) => {
      if (event.type === "chunk") {
        setMessages((current) =>
          current.map((message) =>
            message.id === event.messageId
              ? { ...message, content: message.content + event.text, status: "streaming" }
              : message,
          ),
        );
        return;
      }
      if (event.type === "done") {
        setMessages((current) =>
          current.map((message) => (message.id === event.message.id ? event.message : message)),
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
            providerKeys.find((item) => item.id === selectedKeyId)?.providerSlug ?? event.suggestProviderSlug;
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
        ...(extra !== undefined ? { extraSystem: extra } : {}),
        ...(maxTokens !== null ? { maxTokens } : {}),
      })
      .then(setFallbackPreview)
      .catch(() => setFallbackPreview(null));
  }, [compactHistory, extraSystem, fallback, maxTokens, selectedConversationId]);

  const applyProjectPreferences = useCallback(
    (project: ProjectDto, keys: ProviderKeyDto[]): void => {
      if (project.preferredProvider) {
        const key = keys.find(
          (item) => item.status === "active" && item.providerSlug === project.preferredProvider,
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
      await loadConversations(selectedProjectId);
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
      const result = await window.hub.chat.send({ ...input, compactHistory });
      setError(null);
      setShowAllowOnce(false);
      setFallback(null);
      setRun({ runId: result.runId, conversationId: selectedConversationId });
      setMessages((current) => applySendResult(current, result));
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

  const abortIfLeaving = (nextConversationId: string | null): void => {
    if (run && run.conversationId !== nextConversationId) {
      void window.hub.chat.abort({ runId: run.runId }).catch(fail);
    }
  };

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) {
        return;
      }
      if (event.shiftKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setView("home");
        window.setTimeout(() => projectInputRef.current?.focus(), 0);
        return;
      }
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        void createUntitledChat();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createUntitledChat]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          view={view}
          onChange={(next) => {
            if (next !== "home" && run) {
              void window.hub.chat.abort({ runId: run.runId }).catch(fail);
            }
            setView(next);
          }}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={(id) => {
            abortIfLeaving(null);
            setSelectedProjectId(id);
            setSelectedConversationId(null);
            setMessages([]);
            setBranchLabels({});
            if (id) {
              const next = projects.find((item) => item.id === id);
              if (next) {
                applyProjectPreferences(next, providerKeys);
              }
            }
            void loadConversations(id).catch(fail);
          }}
          onCreateProject={async (name) => {
            try {
              const created = await window.hub.projects.create({ name });
              setError(null);
              const list = await loadProjects();
              const next = list.find((item) => item.id === created.id) ?? created;
              setSelectedProjectId(next.id);
              setSelectedConversationId(null);
              setMessages([]);
              setBranchLabels({});
              abortIfLeaving(null);
              await loadConversations(next.id);
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
          onOpenSearchHit={(hit) => {
            abortIfLeaving(hit.conversationId);
            setSelectedProjectId(hit.projectId);
            setView("home");
            void (async () => {
              try {
                await loadConversations(hit.projectId);
                setSelectedConversationId(hit.conversationId);
                await loadMessages(hit.conversationId);
                if (hit.messageId) {
                  await window.hub.messages.activate({ id: hit.messageId });
                  await loadMessages(hit.conversationId);
                }
                setSearchQuery("");
                setSearchHits([]);
              } catch {
                fail();
              }
            })();
          }}
        />
        <main className="min-w-0 flex-1 bg-background">
          {view === "home" ? (
            <HomeView
              project={selectedProject}
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              messages={messages}
              error={error}
              providerKeys={providerKeys}
              selectedKeyId={selectedKeyId}
              selectedModel={selectedModel}
              temperature={temperature}
              maxTokens={maxTokens}
              extraSystem={extraSystem}
              streaming={run?.conversationId === selectedConversationId}
              sending={sending || activating}
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
                  await loadConversations(selectedProjectId);
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
              onSend={(content) => {
                if (!selectedConversationId || !selectedKeyId) {
                  return Promise.resolve(false);
                }
                return sendToModel({
                  mode: "send",
                  conversationId: selectedConversationId,
                  providerKeyId: selectedKeyId,
                  model: selectedModel,
                  content,
                  temperature,
                  maxTokens,
                  extraSystem,
                  compactHistory,
                });
              }}
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
              onExport={async (mode) => {
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
              }}
              onSaveProject={async (input: Omit<ProjectUpdateInput, "id">) => {
                if (!selectedProjectId) {
                  return;
                }
                try {
                  const updated = await window.hub.projects.update({ id: selectedProjectId, ...input });
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
                try {
                  abortIfLeaving(null);
                  await window.hub.projects.remove({ id: selectedProjectId });
                  setError(null);
                  await loadProjects();
                  setSelectedProjectId(null);
                  setSelectedConversationId(null);
                  setMessages([]);
                  setBranchLabels({});
                  await loadConversations(null);
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
            />
          ) : view === "debug" ? (
            <DebugView />
          ) : (
            <SettingsView />
          )}
        </main>
      </div>
      <StatusBar health={health} />
      <Dialog open={fallback !== null} onOpenChange={(open) => {
        if (!open) {
          setFallback(null);
          setFallbackPreview(null);
        }
      }}>
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
                <p className="text-[12px] text-muted-foreground" data-testid="fallback-estimate">
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
      <ChromeCommandPalette
        onNewProject={() => {
          setView("home");
          window.setTimeout(() => projectInputRef.current?.focus(), 0);
        }}
        onNewChat={() => {
          void createUntitledChat();
        }}
        onSearch={() => {
          setView("home");
          window.setTimeout(() => searchInputRef.current?.focus(), 0);
        }}
        onDebug={() => setView("debug")}
      />
    </div>
  );
}
