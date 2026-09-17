import { type JSX, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ConversationDto, MessageDto, ProjectDto, ProviderKeyDto } from "@ai-hub/shared";
import { openaiCatalogModels } from "@ai-hub/shared";
import { ChatComposer } from "@/components/chat/chat-composer";
import { MessageBubble } from "@/components/chat/message-bubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export function HomeView({
  project,
  conversations,
  selectedConversationId,
  messages,
  error,
  providerKeys,
  selectedKeyId,
  selectedModel,
  streaming,
  sending,
  onSelectConversation,
  onCreateConversation,
  onSelectKey,
  onSelectModel,
  onSend,
  onAbort,
  onRegenerate,
  onContinue,
  onEditUser,
}: {
  project: ProjectDto | null;
  conversations: ConversationDto[];
  selectedConversationId: string | null;
  messages: MessageDto[];
  error: string | null;
  providerKeys: ProviderKeyDto[];
  selectedKeyId: string | null;
  selectedModel: string;
  streaming: boolean;
  sending: boolean;
  onSelectConversation: (id: string) => void;
  onCreateConversation: (title: string) => Promise<void>;
  onSelectKey: (id: string) => void;
  onSelectModel: (id: string) => void;
  onSend: (content: string) => Promise<void>;
  onAbort: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onContinue: () => Promise<void>;
  onEditUser: (id: string, content: string) => Promise<void>;
}): JSX.Element {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState("");
  const openaiKeys = providerKeys.filter((key) => key.providerSlug === "openai");
  const models = openaiCatalogModels();
  const hasKey = selectedKeyId !== null && openaiKeys.some((key) => key.id === selectedKeyId);
  const busy = streaming || sending;

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
                  aria-current={selectedConversationId === conversation.id ? "true" : undefined}
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
            <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
              {openaiKeys.length === 0 ? (
                <p className="text-muted-foreground">{t("workspace.noKey")}</p>
              ) : (
                <>
                  <label className="flex items-center gap-1">
                    <span className="text-muted-foreground">{t("workspace.key")}</span>
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={selectedKeyId ?? openaiKeys[0]?.id}
                      onChange={(event) => onSelectKey(event.target.value)}
                      aria-label={t("workspace.key")}
                    >
                      {openaiKeys.map((key) => (
                        <option key={key.id} value={key.id}>
                          {key.label} ({key.maskedKey})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="text-muted-foreground">{t("workspace.model")}</span>
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={selectedModel}
                      onChange={(event) => onSelectModel(event.target.value)}
                      aria-label={t("workspace.model")}
                    >
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </header>
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <p className="text-muted-foreground">{t("workspace.noMessages")}</p>
              ) : (
                <ol className="flex flex-col gap-2" aria-live="polite">
                  {messages.map((message, index) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isLast={index === messages.length - 1}
                      busy={busy}
                      onRegenerate={() => {
                        void onRegenerate();
                      }}
                      onContinue={() => {
                        void onContinue();
                      }}
                      onEdit={async (content) => {
                        await onEditUser(message.id, content);
                      }}
                    />
                  ))}
                </ol>
              )}
            </ScrollArea>
            <ChatComposer
              key={selectedConversationId}
              value={draft}
              onChange={setDraft}
              streaming={streaming}
              sending={sending}
              disabled={!hasKey}
              onSend={() => {
                const next = draft.trim();
                if (!next) {
                  return;
                }
                void onSend(next).then(() => setDraft(""));
              }}
              onAbort={() => {
                void onAbort();
              }}
            />
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
