import { type JSX, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ConversationDto, MessageDto, ProjectDto } from "@ai-hub/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export function HomeView({
  project,
  conversations,
  selectedConversationId,
  messages,
  error,
  onSelectConversation,
  onCreateConversation,
  onCreateMessage,
}: {
  project: ProjectDto | null;
  conversations: ConversationDto[];
  selectedConversationId: string | null;
  messages: MessageDto[];
  error: string | null;
  onSelectConversation: (id: string) => void;
  onCreateConversation: (title: string) => Promise<void>;
  onCreateMessage: (content: string) => Promise<void>;
}): JSX.Element {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex max-w-md flex-col items-start gap-3">
          <h1 className="text-base font-semibold">{t("empty.title")}</h1>
          <p className="text-muted-foreground">{t("empty.body")}</p>
          {error ? (
            <p className="text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <section className="flex w-64 shrink-0 flex-col border-r">
        <div className="border-b p-3">
          <h1 className="truncate text-sm font-semibold">{project.name}</h1>
          <p className="text-muted-foreground">{t("workspace.conversations")}</p>
        </div>
        <ScrollArea className="flex-1 p-2">
          {conversations.length === 0 ? (
            <p className="px-2 text-muted-foreground">{t("workspace.noConversations")}</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {conversations.map((conversation) => (
                <Button
                  key={conversation.id}
                  type="button"
                  variant={selectedConversationId === conversation.id ? "secondary" : "ghost"}
                  className="h-8 w-full justify-start truncate"
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  {conversation.title}
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
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
          />
          <Button type="submit" size="sm" className="h-7">
            {t("workspace.newConversation")}
          </Button>
        </form>
      </section>
      <section className="flex min-w-0 flex-1 flex-col">
        {selectedConversationId ? (
          <>
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <p className="text-muted-foreground">{t("workspace.noMessages")}</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {messages.map((message) => (
                    <li key={message.id} className="rounded-md border bg-card p-2">
                      <p className="text-[11px] uppercase text-muted-foreground">
                        {message.role}
                        {message.parentId ? ` · ${t("workspace.branched")}` : ""}
                      </p>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </li>
                  ))}
                </ol>
              )}
            </ScrollArea>
            <form
              className="flex gap-2 border-t p-2"
              onSubmit={(event) => {
                event.preventDefault();
                const next = note.trim();
                if (!next) {
                  return;
                }
                void onCreateMessage(next).then(() => setNote(""));
              }}
            >
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t("workspace.notePlaceholder")}
                aria-label={t("workspace.notePlaceholder")}
              />
              <Button type="submit">{t("workspace.addNote")}</Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
            {t("workspace.pickConversation")}
          </div>
        )}
        {error ? (
          <p className="border-t px-3 py-2 text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
