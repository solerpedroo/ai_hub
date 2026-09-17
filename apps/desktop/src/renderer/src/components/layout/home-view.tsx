import { type JSX, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  ConversationDto,
  MessageDto,
  ProjectDto,
  ProviderAgnosticPacket,
  ProviderKeyDto,
} from "@ai-hub/shared";
import { openaiCatalogModels } from "@ai-hub/shared";
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
  packet,
  streaming,
  onSelectConversation,
  onCreateConversation,
  onCreateMessage,
  onSelectKey,
  onSelectModel,
  onSendToModel,
  onAbort,
}: {
  project: ProjectDto | null;
  conversations: ConversationDto[];
  selectedConversationId: string | null;
  messages: MessageDto[];
  error: string | null;
  providerKeys: ProviderKeyDto[];
  selectedKeyId: string | null;
  selectedModel: string;
  packet: ProviderAgnosticPacket | null;
  streaming: boolean;
  onSelectConversation: (id: string) => void;
  onCreateConversation: (title: string) => Promise<void>;
  onCreateMessage: (content: string) => Promise<void>;
  onSelectKey: (id: string) => void;
  onSelectModel: (id: string) => void;
  onSendToModel: () => Promise<void>;
  onAbort: () => Promise<void>;
}): JSX.Element {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const openaiKeys = providerKeys.filter((key) => key.providerSlug === "openai");
  const models = openaiCatalogModels();

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
                        {message.status !== "complete" ? ` · ${t(`workspace.status.${message.status}`)}` : ""}
                        {message.parentId ? ` · ${t("workspace.branched")}` : ""}
                      </p>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      {message.receipt ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {t("workspace.receipt", {
                            model: message.receipt.model ?? "—",
                            tokensIn: message.receipt.tokensIn ?? "—",
                            tokensOut: message.receipt.tokensOut ?? "—",
                            cost: message.receipt.costUsd ?? "—",
                            latency: message.receipt.latencyMs ?? "—",
                          })}
                          {message.receipt.errorCode
                            ? ` · ${t("workspace.receipt.error", { code: message.receipt.errorCode })}`
                            : ""}
                        </p>
                      ) : null}
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
            <div className="flex flex-col gap-2 border-t p-2">
              <p className="text-[11px] font-medium uppercase text-muted-foreground">{t("workspace.debug.title")}</p>
              {openaiKeys.length === 0 ? (
                <p className="text-muted-foreground">{t("workspace.debug.noKey")}</p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1">
                    <span className="text-muted-foreground">{t("workspace.debug.key")}</span>
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={selectedKeyId ?? openaiKeys[0]?.id}
                      onChange={(event) => onSelectKey(event.target.value)}
                      aria-label={t("workspace.debug.key")}
                    >
                      {openaiKeys.map((key) => (
                        <option key={key.id} value={key.id}>
                          {key.label} ({key.maskedKey})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="text-muted-foreground">{t("workspace.debug.model")}</span>
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={selectedModel}
                      onChange={(event) => onSelectModel(event.target.value)}
                      aria-label={t("workspace.debug.model")}
                    >
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8"
                    disabled={streaming}
                    onClick={() => {
                      void onSendToModel();
                    }}
                  >
                    {t("workspace.debug.send")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={!streaming}
                    onClick={() => {
                      void onAbort();
                    }}
                  >
                    {t("workspace.debug.abort")}
                  </Button>
                </div>
              )}
              {packet ? (
                <pre className="max-h-32 overflow-auto rounded-md border bg-muted/40 p-2 font-mono text-[11px]">
                  {t("workspace.debug.packet")}
                  {"\n"}
                  {JSON.stringify(packet, null, 2)}
                </pre>
              ) : null}
            </div>
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
