import { type JSX, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  activePath,
  catalogModelsForProvider,
  findCatalogModel,
  type BranchLabels,
  type CatalogModel,
  type ConversationDto,
  type MessageDto,
  type ProjectDto,
  type ProviderKeyDto,
} from "@ai-hub/shared";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ConversationTree } from "@/components/chat/conversation-tree";
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
  temperature,
  maxTokens,
  extraSystem,
  streaming,
  sending,
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
}: {
  project: ProjectDto | null;
  conversations: ConversationDto[];
  selectedConversationId: string | null;
  messages: MessageDto[];
  error: string | null;
  providerKeys: ProviderKeyDto[];
  selectedKeyId: string | null;
  selectedModel: string;
  temperature: number;
  maxTokens: number | null;
  extraSystem: string;
  streaming: boolean;
  sending: boolean;
  branchLabels: BranchLabels;
  exportNotice: string | null;
  onSelectConversation: (id: string) => void;
  onCreateConversation: (title: string) => Promise<void>;
  onSelectKey: (id: string) => void;
  onSelectModel: (id: string) => void;
  onSelectTemperature: (value: number) => void;
  onSelectMaxTokens: (value: number | null) => void;
  onSelectExtraSystem: (value: string) => void;
  onSend: (content: string) => Promise<void>;
  onAbort: () => Promise<void>;
  onRegenerate: (messageId: string) => Promise<void>;
  onContinue: () => Promise<void>;
  onEditUser: (id: string, content: string) => Promise<void>;
  onActivate: (id: string) => Promise<void>;
  onRenameBranch: (branchId: string, label: string) => Promise<void>;
  onExport: (mode: "active" | "tree") => Promise<void>;
}): JSX.Element {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);
  const selectedKey = providerKeys.find((key) => key.id === selectedKeyId) ?? providerKeys[0] ?? null;
  const providerSlug = selectedKey?.providerSlug ?? null;
  const models = providerSlug ? catalogModelsForProvider(providerSlug) : [];
  const selectedCatalog: CatalogModel | null =
    providerSlug && selectedModel ? findCatalogModel(selectedModel, providerSlug) : null;
  const hasKey = selectedKeyId !== null && providerKeys.some((key) => key.id === selectedKeyId);
  const busy = streaming || sending;
  const path = activePath(messages);
  const activeIds = new Set(path.map((item) => item.id));
  const leaf = path[path.length - 1] ?? null;

  useEffect(() => {
    setEditing(false);
    setTreeOpen(false);
  }, [selectedConversationId]);

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
                  <label className="flex items-center gap-1">
                    <span className="text-muted-foreground">{t("workspace.model")}</span>
                    {providerSlug === "custom" ? (
                      <Input
                        className="h-8 w-52"
                        value={selectedModel}
                        onChange={(event) => onSelectModel(event.target.value)}
                        aria-label={t("workspace.customModel")}
                        data-testid="workspace-custom-model"
                      />
                    ) : (
                      <select
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
                  {selectedCatalog ? (
                    <span className="text-[11px] text-muted-foreground">
                      {t("workspace.model.price", {
                        input: selectedCatalog.inputUsdPerMillion,
                        output: selectedCatalog.outputUsdPerMillion,
                      })}
                    </span>
                  ) : null}
                  <label className="flex items-center gap-1">
                    <span className="text-muted-foreground">{t("workspace.temperature")}</span>
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
                    <span className="text-muted-foreground">{t("workspace.maxTokens")}</span>
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
              </div>
            </header>
            {exportNotice ? (
              <p className="border-b px-3 py-1 text-[11px] text-muted-foreground" role="status">
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
                    />
                  ))}
                </ol>
              )}
            </ScrollArea>
            <label className="flex flex-col gap-1 border-t px-3 py-2 text-[12px]">
              <span className="text-muted-foreground">{t("workspace.extraSystem")}</span>
              <textarea
                className="min-h-[2.5rem] resize-y rounded-md border bg-background px-2 py-1 text-[13px]"
                value={extraSystem}
                onChange={(event) => onSelectExtraSystem(event.target.value)}
                aria-label={t("workspace.extraSystem")}
              />
            </label>
            <ChatComposer
              key={selectedConversationId}
              value={draft}
              onChange={setDraft}
              streaming={streaming}
              sending={sending}
              disabled={!hasKey || editing}
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
            </div>
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
          <p className="border-t px-3 py-2 text-destructive" role="alert" data-testid="workspace-error">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
