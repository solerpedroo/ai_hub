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
  type PacketPreviewResult,
  type ProjectDto,
  type ProjectUpdateInput,
  type ProviderKeyDto,
} from "@ai-hub/shared";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ConversationTree } from "@/components/chat/conversation-tree";
import { MessageBubble } from "@/components/chat/message-bubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const PROJECT_COLORS = ["#64748b", "#2563eb", "#7c3aed", "#db2777", "#dc2626", "#d97706", "#16a34a", "#0891b2"] as const;

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
  onSaveProject,
  onRemoveProject,
  onSetTags,
  compactHistory,
  onToggleCompact,
  packetPreview,
  modelSwitchNotice,
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
  onSaveProject: (input: Omit<ProjectUpdateInput, "id">) => Promise<void>;
  onRemoveProject: () => Promise<void>;
  onSetTags: (names: string[]) => Promise<void>;
  compactHistory: boolean;
  onToggleCompact: (value: boolean) => void;
  packetPreview: PacketPreviewResult | null;
  modelSwitchNotice: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [projectName, setProjectName] = useState(project?.name ?? "");
  const [projectColor, setProjectColor] = useState<string | null>(project?.color ?? null);
  const [projectInstructions, setProjectInstructions] = useState(project?.instructions ?? "");
  const [preferredProvider, setPreferredProvider] = useState(project?.preferredProvider ?? "");
  const [preferredModel, setPreferredModel] = useState(project?.preferredModel ?? "");
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
  const selectedConversation = conversations.find((item) => item.id === selectedConversationId) ?? null;
  const providerSlugs = [...new Set(providerKeys.map((item) => item.providerSlug))];
  const preferredModels = preferredProvider ? catalogModelsForProvider(preferredProvider) : [];

  useEffect(() => {
    setEditing(false);
    setTreeOpen(false);
    setTagDraft("");
  }, [selectedConversationId]);

  useEffect(() => {
    setProjectName(project?.name ?? "");
    setProjectColor(project?.color ?? null);
    setProjectInstructions(project?.instructions ?? "");
    setPreferredProvider(project?.preferredProvider ?? "");
    setPreferredModel(project?.preferredModel ?? "");
  }, [project]);

  return (
    <div className="flex h-full min-h-0">
      <section className="flex w-64 shrink-0 flex-col border-r">
        <div className="border-b p-3">
          <h1 className="truncate text-sm font-semibold">
            {project ? project.name : t("workspace.inbox")}
          </h1>
          <p className="text-muted-foreground">
            {project ? t("workspace.conversations") : t("workspace.inboxHint")}
          </p>
        </div>
        <ScrollArea className="flex-1 p-2">
          {conversations.length === 0 ? (
            <p className="px-2 text-muted-foreground">
              {project ? t("workspace.noConversations") : t("workspace.noConversationsInbox")}
            </p>
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
          {selectedConversation ? (
            <form
              className="mt-3 flex flex-col gap-1 border-t pt-2"
              onSubmit={(event) => {
                event.preventDefault();
                const next = tagDraft.trim();
                if (!next) {
                  return;
                }
                const names = selectedConversation.tags.includes(next)
                  ? selectedConversation.tags
                  : [...selectedConversation.tags, next];
                void onSetTags(names).then(() => setTagDraft(""));
              }}
            >
              <p className="px-1 text-[11px] text-muted-foreground">{t("workspace.tags")}</p>
              <div className="flex flex-wrap gap-1 px-1">
                {selectedConversation.tags.map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-6 px-2 text-[11px]"
                    aria-label={t("workspace.tagRemove", { tag })}
                    onClick={() => {
                      void onSetTags(selectedConversation.tags.filter((item) => item !== tag));
                    }}
                  >
                    {tag} ×
                  </Button>
                ))}
              </div>
              <Input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                placeholder={t("workspace.tagPlaceholder")}
                aria-label={t("workspace.tagPlaceholder")}
                data-testid="conversation-tag"
              />
              <Button type="submit" size="sm" className="h-7" data-testid="conversation-tag-add">
                {t("workspace.tagAdd")}
              </Button>
            </form>
          ) : null}
          {project ? (
            <form
              className="mt-3 flex flex-col gap-2 border-t pt-2"
              onSubmit={(event) => {
                event.preventDefault();
                const name = projectName.trim();
                if (!name) {
                  return;
                }
                void onSaveProject({
                  name,
                  color: projectColor,
                  instructions: projectInstructions.trim().length > 0 ? projectInstructions : null,
                  preferredModel: preferredModel.trim().length > 0 ? preferredModel.trim() : null,
                  preferredProvider: preferredProvider.trim().length > 0 ? preferredProvider.trim() : null,
                });
              }}
            >
              <Input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                aria-label={t("workspace.projectPlaceholder")}
              />
              <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                {t("workspace.projectColor")}
                <div className="flex flex-wrap gap-1">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: color }}
                      aria-label={color}
                      aria-pressed={projectColor === color}
                      data-testid="project-color"
                      onClick={() => setProjectColor(color)}
                    />
                  ))}
                </div>
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                {t("workspace.projectInstructions")}
                <textarea
                  className="min-h-[4rem] resize-y rounded-md border bg-background px-2 py-1 text-[12px] text-foreground"
                  value={projectInstructions}
                  onChange={(event) => setProjectInstructions(event.target.value)}
                  aria-label={t("workspace.projectInstructions")}
                  data-testid="project-instructions"
                />
                <span>{t("workspace.projectInstructionsHint")}</span>
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                {t("workspace.preferredProvider")}
                <select
                  className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
                  value={preferredProvider}
                  onChange={(event) => setPreferredProvider(event.target.value)}
                  aria-label={t("workspace.preferredProvider")}
                >
                  <option value="">{t("workspace.preferredNone")}</option>
                  {providerSlugs.map((slug) => (
                    <option key={slug} value={slug}>
                      {slug}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                {t("workspace.preferredModel")}
                {preferredModels.length > 0 ? (
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
                    value={preferredModel}
                    onChange={(event) => setPreferredModel(event.target.value)}
                    aria-label={t("workspace.preferredModel")}
                  >
                    <option value="">{t("workspace.preferredNone")}</option>
                    {preferredModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={preferredModel}
                    onChange={(event) => setPreferredModel(event.target.value)}
                    aria-label={t("workspace.preferredModel")}
                  />
                )}
              </label>
              <Button type="submit" size="sm" className="h-7" data-testid="project-save">
                {t("workspace.saveProject")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7"
                data-testid="project-delete"
                onClick={() => {
                  if (window.confirm(t("workspace.deleteProjectConfirm", { name: project.name }))) {
                    void onRemoveProject();
                  }
                }}
              >
                {t("workspace.deleteProject")}
              </Button>
            </form>
          ) : null}
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
          <Button type="submit" size="sm" className="h-7" data-testid="workspace-new-conversation">
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
                {packetPreview ? (
                  <span
                    className="rounded-md border px-2 py-1 text-[11px] text-muted-foreground"
                    data-testid="packet-badge"
                  >
                    {t("workspace.packet.badge", { n: packetPreview.tokenEstimate })}
                  </span>
                ) : null}
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
            {modelSwitchNotice ? (
              <p className="border-b px-3 py-1 text-[11px] text-muted-foreground" role="status" data-testid="model-switch-notice">
                {t("workspace.modelSwitch", { model: selectedModel })}
              </p>
            ) : null}
            {packetPreview?.overflow ? (
              <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-[12px]" role="status">
                <p>
                  {t("workspace.overflow", {
                    window: packetPreview.contextWindow,
                    estimate: packetPreview.tokenEstimate,
                  })}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant={compactHistory ? "secondary" : "outline"}
                  data-testid="compact-history"
                  onClick={() => onToggleCompact(!compactHistory)}
                >
                  {compactHistory ? t("workspace.compact.off") : t("workspace.compact")}
                </Button>
              </div>
            ) : compactHistory ? (
              <p className="border-b px-3 py-1 text-[11px] text-muted-foreground">{t("workspace.compact.on")}</p>
            ) : null}
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
