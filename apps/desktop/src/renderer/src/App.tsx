import { useCallback, useEffect, useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import type {
  BranchLabels,
  ChatSendInput,
  ChatSendResult,
  ConversationDto,
  MessageDto,
  ProjectDto,
  ProviderKeyDto,
} from "@ai-hub/shared";
import { findCatalogModel, upsertActivated } from "@ai-hub/shared";
import { TitleBar } from "@/components/layout/title-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { StatusBar } from "@/components/layout/status-bar";
import { HomeView } from "@/components/layout/home-view";
import { SettingsView } from "@/components/layout/settings-view";
import { ChromeCommandPalette } from "@/components/layout/command-palette";
import type { AppView } from "@/components/layout/types";

function applySendResult(current: MessageDto[], result: ChatSendResult): MessageDto[] {
  let next = current;
  if (result.userMessage) {
    next = upsertActivated(next, result.userMessage);
  }
  return upsertActivated(next, result.assistant);
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
  const [run, setRun] = useState<{ runId: string; conversationId: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [activating, setActivating] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchLabels, setBranchLabels] = useState<BranchLabels>({});
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const fail = useCallback((): void => {
    setError(t("workspace.error.generic"));
  }, [t]);

  const loadProjects = useCallback(async (): Promise<ProjectDto[]> => {
    const list = await window.hub.projects.list();
    setProjects(list);
    return list;
  }, []);

  const loadConversations = useCallback(async (projectId: string): Promise<ConversationDto[]> => {
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

  useEffect(() => {
    void (async () => {
      try {
        const [projectList, keys, session] = await Promise.all([
          loadProjects(),
          loadKeys(),
          window.hub.settings.getSession(),
        ]);
        const openai = keys.find((item) => item.providerSlug === "openai" && item.status === "active");
        setSelectedKeyId(openai?.id ?? null);
        if (findCatalogModel(session.model, "openai")) {
          setSelectedModel(session.model);
        }
        const project =
          projectList.find((item) => item.id === session.projectId) ?? projectList[0] ?? null;
        if (!project) {
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
        setSessionReady(true);
      } catch {
        fail();
        setSessionReady(true);
      }
    })();
  }, [fail, loadConversations, loadKeys, loadMessages, loadProjects]);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }
    void window.hub.settings
      .setSession({
        projectId: selectedProjectId,
        conversationId: selectedConversationId,
        model: selectedModel,
      })
      .catch(fail);
  }, [fail, selectedConversationId, selectedModel, selectedProjectId, sessionReady]);

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
          return list.find((item) => item.providerSlug === "openai" && item.status === "active")?.id ?? null;
        });
      })
      .catch(fail);
  }, [fail, loadKeys, view]);

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
        return;
      }
      setRun((current) => (current?.runId === event.runId ? null : current));
      if (event.code !== "aborted") {
        setError(t("workspace.error.chat", { code: event.code }));
      }
      setSelectedConversationId((conversationId) => {
        if (conversationId) {
          void loadMessages(conversationId).catch(fail);
        }
        return conversationId;
      });
    });
    return off;
  }, [fail, loadMessages, t]);

  const sendToModel = async (input: ChatSendInput): Promise<void> => {
    if (!selectedConversationId || !selectedKeyId) {
      return;
    }
    setSending(true);
    try {
      const result = await window.hub.chat.send(input);
      setError(null);
      setRun({ runId: result.runId, conversationId: selectedConversationId });
      setMessages((current) => applySendResult(current, result));
    } catch {
      fail();
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
                if (!selectedProjectId) {
                  return;
                }
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
              onSend={(content) => {
                if (!selectedConversationId || !selectedKeyId) {
                  return Promise.resolve();
                }
                return sendToModel({
                  mode: "send",
                  conversationId: selectedConversationId,
                  providerKeyId: selectedKeyId,
                  model: selectedModel,
                  content,
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
                });
              }}
              onContinue={() => {
                if (!selectedConversationId || !selectedKeyId) {
                  return Promise.resolve();
                }
                return sendToModel({
                  mode: "continue",
                  conversationId: selectedConversationId,
                  providerKeyId: selectedKeyId,
                  model: selectedModel,
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
            />
          ) : (
            <SettingsView />
          )}
        </main>
      </div>
      <StatusBar />
      <ChromeCommandPalette />
    </div>
  );
}
