import { useCallback, useEffect, useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import type { ConversationDto, MessageDto, ProjectDto, ProviderKeyDto } from "@ai-hub/shared";
import { findCatalogModel } from "@ai-hub/shared";
import { TitleBar } from "@/components/layout/title-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { StatusBar } from "@/components/layout/status-bar";
import { HomeView } from "@/components/layout/home-view";
import { SettingsView } from "@/components/layout/settings-view";
import { ChromeCommandPalette } from "@/components/layout/command-palette";
import type { AppView } from "@/components/layout/types";

function placeholderAssistant(
  conversationId: string,
  messageId: string,
  parentId: string | null,
  branchId: string,
): MessageDto {
  return {
    id: messageId,
    conversationId,
    parentId,
    branchId,
    role: "assistant",
    content: "",
    status: "streaming",
    createdAt: new Date().toISOString(),
    receipt: null,
  };
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
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const sendToModel = async (content: string | null): Promise<void> => {
    if (!selectedConversationId || !selectedKeyId) {
      return;
    }
    setSending(true);
    try {
      const result = await window.hub.chat.send({
        conversationId: selectedConversationId,
        providerKeyId: selectedKeyId,
        model: selectedModel,
        content,
      });
      setError(null);
      setRun({ runId: result.runId, conversationId: selectedConversationId });
      setMessages((current) => {
        let next = current;
        if (result.userMessageId && content && !next.some((item) => item.id === result.userMessageId)) {
          const last = next[next.length - 1];
          next = [
            ...next,
            {
              id: result.userMessageId,
              conversationId: selectedConversationId,
              parentId: last?.id ?? null,
              branchId: last?.branchId ?? result.userMessageId,
              role: "user",
              content,
              status: "complete",
              createdAt: new Date().toISOString(),
              receipt: null,
            },
          ];
        }
        if (next.some((item) => item.id === result.messageId)) {
          return next;
        }
        const last = next[next.length - 1];
        return [
          ...next,
          placeholderAssistant(
            selectedConversationId,
            result.messageId,
            last?.id ?? null,
            last?.branchId ?? result.messageId,
          ),
        ];
      });
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
              sending={sending}
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
                  abortIfLeaving(created.id);
                } catch {
                  fail();
                }
              }}
              onSelectKey={setSelectedKeyId}
              onSelectModel={setSelectedModel}
              onSend={(content) => sendToModel(content)}
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
              onRegenerate={async () => {
                const last = messages[messages.length - 1];
                if (!last || last.role !== "assistant") {
                  return;
                }
                try {
                  await window.hub.messages.deleteFrom({ id: last.id });
                  const index = messages.findIndex((item) => item.id === last.id);
                  setMessages(index < 0 ? messages : messages.slice(0, index));
                  await sendToModel(null);
                } catch {
                  fail();
                  if (selectedConversationId) {
                    void loadMessages(selectedConversationId).catch(fail);
                  }
                }
              }}
              onContinue={() => sendToModel(null)}
              onEditUser={async (id, content) => {
                const target = messages.find((item) => item.id === id);
                if (!target) {
                  return;
                }
                try {
                  const updated = await window.hub.messages.update({ id, content });
                  const laterFirst = messages.find((item) => item.createdAt > target.createdAt);
                  if (laterFirst) {
                    await window.hub.messages.deleteFrom({ id: laterFirst.id });
                  }
                  setMessages(
                    messages
                      .filter((item) => item.createdAt <= target.createdAt)
                      .map((item) => (item.id === updated.id ? updated : item)),
                  );
                  await sendToModel(null);
                } catch {
                  fail();
                  if (selectedConversationId) {
                    void loadMessages(selectedConversationId).catch(fail);
                  }
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
