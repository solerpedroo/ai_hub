import { useCallback, useEffect, useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import type { ConversationDto, MessageDto, ProjectDto } from "@ai-hub/shared";
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
      })
      .catch(fail);
  }, [fail, loadConversations, selectedProjectId]);

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
              onSelectConversation={(id) => {
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
