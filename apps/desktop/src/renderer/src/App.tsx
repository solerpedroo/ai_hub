import { useCallback, useEffect, useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import type {
  ConversationDto,
  MessageDto,
  ProjectDto,
  ProviderAgnosticPacket,
  ProviderKeyDto,
} from "@ai-hub/shared";
import { TitleBar } from "@/components/layout/title-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { StatusBar } from "@/components/layout/status-bar";
import { HomeView } from "@/components/layout/home-view";
import { SettingsView } from "@/components/layout/settings-view";
import { ChromeCommandPalette } from "@/components/layout/command-palette";
import type { AppView } from "@/components/layout/types";

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
  const [packet, setPacket] = useState<ProviderAgnosticPacket | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fail = useCallback((): void => {
    setError(t("workspace.error.generic"));
  }, [t]);

  const loadProjects = useCallback(async (): Promise<ProjectDto[]> => {
    const list = await window.hub.projects.list();
    setProjects(list);
    return list;
  }, []);

  const loadConversations = useCallback(async (projectId: string): Promise<void> => {
    const list = await window.hub.conversations.list({ projectId });
    setConversations(list);
  }, []);

  const loadMessages = useCallback(async (conversationId: string): Promise<void> => {
    const list = await window.hub.messages.list({ conversationId });
    setMessages(list);
  }, []);

  const loadKeys = useCallback(async (): Promise<void> => {
    const list = await window.hub.secrets.list();
    setProviderKeys(list);
    const openai = list.find((item) => item.providerSlug === "openai");
    setSelectedKeyId((current) => current ?? openai?.id ?? null);
  }, []);

  useEffect(() => {
    void loadProjects()
      .then((list) => {
        const first = list[0];
        if (first) {
          setSelectedProjectId(first.id);
        }
      })
      .catch(fail);
  }, [fail, loadProjects]);

  useEffect(() => {
    if (view !== "home") {
      return;
    }
    void loadKeys().catch(fail);
  }, [fail, loadKeys, view]);

  useEffect(() => {
    if (!selectedProjectId) {
      setConversations([]);
      setSelectedConversationId(null);
      setMessages([]);
      return;
    }
    void loadConversations(selectedProjectId)
      .then(() => {
        setSelectedConversationId(null);
        setMessages([]);
        setPacket(null);
        setRunId(null);
      })
      .catch(fail);
  }, [fail, loadConversations, selectedProjectId]);

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
        setPacket(event.packet);
        setRunId(null);
        return;
      }
      setRunId(null);
      setError(t("workspace.error.chat", { code: event.code }));
      setSelectedConversationId((conversationId) => {
        if (conversationId) {
          void loadMessages(conversationId).catch(fail);
        }
        return conversationId;
      });
    });
    return off;
  }, [fail, loadMessages, t]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          view={view}
          onChange={setView}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          onCreateProject={async (name) => {
            try {
              const created = await window.hub.projects.create({ name });
              setError(null);
              const list = await loadProjects();
              const next = list.find((item) => item.id === created.id) ?? created;
              setSelectedProjectId(next.id);
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
              packet={packet}
              streaming={runId !== null}
              onSelectConversation={(id) => {
                setSelectedConversationId(id);
                setPacket(null);
                setRunId(null);
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
                  setPacket(null);
                  setRunId(null);
                } catch {
                  fail();
                }
              }}
              onCreateMessage={async (content) => {
                if (!selectedConversationId) {
                  return;
                }
                const parentId = null;
                try {
                  await window.hub.messages.create({
                    conversationId: selectedConversationId,
                    role: "user",
                    content,
                    parentId,
                    branchId: null,
                  });
                  setError(null);
                  await loadMessages(selectedConversationId);
                } catch {
                  fail();
                }
              }}
              onSelectKey={setSelectedKeyId}
              onSelectModel={setSelectedModel}
              onSendToModel={async () => {
                if (!selectedConversationId || !selectedKeyId) {
                  return;
                }
                try {
                  const result = await window.hub.chat.send({
                    conversationId: selectedConversationId,
                    providerKeyId: selectedKeyId,
                    model: selectedModel,
                  });
                  setError(null);
                  setPacket(result.packet);
                  setRunId(result.runId);
                  setMessages((current) => {
                    if (current.some((item) => item.id === result.messageId)) {
                      return current;
                    }
                    const last = current[current.length - 1];
                    return [
                      ...current,
                      {
                        id: result.messageId,
                        conversationId: selectedConversationId,
                        parentId: last?.id ?? null,
                        branchId: last?.branchId ?? result.messageId,
                        role: "assistant",
                        content: "",
                        status: "streaming",
                        createdAt: new Date().toISOString(),
                        receipt: null,
                      },
                    ];
                  });
                } catch {
                  fail();
                }
              }}
              onAbort={async () => {
                if (!runId) {
                  return;
                }
                try {
                  await window.hub.chat.abort({ runId });
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
