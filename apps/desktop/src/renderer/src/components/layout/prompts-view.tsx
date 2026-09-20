import { type JSX, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  catalogModelsForProvider,
  classifyHubIpcError,
  parseSpendCapError,
  PROMPT_FOLDERS,
  type MessageDto,
  type PacketPrivacyMode,
  type PlaygroundRunResult,
  type ProjectDto,
  type PromptDto,
  type PromptFolder,
  type ProviderKeyDto,
  type HealthSummaryDto,
  COUNCIL_ROLES,
  recommendModelRoute,
  estimateCostUsd,
  findCatalogModel,
  DEFAULT_ESTIMATED_OUTPUT_TOKENS,
} from "@ai-hub/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type PlaygroundColumn = {
  providerKeyId: string;
  model: string;
  messages: MessageDto[];
  runId: string | null;
};

function defaultSlots(keys: ProviderKeyDto[]): PlaygroundColumn[] {
  const slots: PlaygroundColumn[] = [];
  const seen = new Set<string>();
  const ordered = [...keys.filter((key) => key.status === "active"), ...keys];
  for (const key of ordered) {
    for (const model of catalogModelsForProvider(key.providerSlug)) {
      const token = `${key.id}::${model.id}`;
      if (seen.has(token)) {
        continue;
      }
      seen.add(token);
      slots.push({ providerKeyId: key.id, model: model.id, messages: [], runId: null });
      if (slots.length === 2) {
        return slots;
      }
    }
  }
  while (slots.length < 2) {
    slots.push({ providerKeyId: "", model: "gpt-4o-mini", messages: [], runId: null });
  }
  return slots;
}

export function PromptsView({
  project,
  providerKeys,
  privacyMode,
  onInsertIntoComposer,
  conversationId,
  health,
}: {
  project: ProjectDto | null;
  providerKeys: ProviderKeyDto[];
  privacyMode: PacketPrivacyMode;
  onInsertIntoComposer: (text: string) => void;
  conversationId: string | null;
  health: HealthSummaryDto[];
}): JSX.Element {
  const { t } = useTranslation();
  const [prompts, setPrompts] = useState<PromptDto[]>([]);
  const [folder, setFolder] = useState<PromptFolder>("development");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [playgroundDraft, setPlaygroundDraft] = useState("");
  const [slots, setSlots] = useState<PlaygroundColumn[]>(() => defaultSlots(providerKeys));
  const [running, setRunning] = useState(false);
  const [winnerTitle, setWinnerTitle] = useState("");
  const [councilDraft, setCouncilDraft] = useState("");
  const [councilRunning, setCouncilRunning] = useState(false);
  const [routerConfirmed, setRouterConfirmed] = useState(false);
  const [routerChoice, setRouterChoice] = useState("");
  const [councilResult, setCouncilResult] = useState<{ divergences: string[]; synthesis: MessageDto | null; debate: MessageDto[] } | null>(null);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  const selected = prompts.find((item) => item.id === selectedId) ?? null;
  const folderPrompts = prompts.filter((item) => item.folder === folder);

  const keyOptions = useMemo(
    () =>
      providerKeys.flatMap((key) =>
        catalogModelsForProvider(key.providerSlug).map((model) => ({
          value: `${key.id}::${model.id}`,
          label: `${key.label} · ${model.label}`,
          providerKeyId: key.id,
          model: model.id,
        })),
      ),
    [providerKeys],
  );
  const routerRecommendation = recommendModelRoute(councilDraft);
  const recommendedRouterOption = useMemo(() => {
    const candidates = keyOptions.map((option) => {
      const provider = providerKeys.find((key) => key.id === option.providerKeyId)?.providerSlug ?? "";
      const model = findCatalogModel(option.model, provider);
      const cost = model ? model.inputUsdPerMillion + model.outputUsdPerMillion : Number.POSITIVE_INFINITY;
      const latency = health.find((item) => item.providerSlug === provider)?.lastLatencyMs ?? Number.POSITIVE_INFINITY;
      return { option, cost, latency };
    });
    if (routerRecommendation.tier === "frontier") return candidates.sort((a, b) => b.cost - a.cost || a.latency - b.latency)[0]?.option;
    if (routerRecommendation.tier === "fast") return candidates.sort((a, b) => a.latency - b.latency || a.cost - b.cost)[0]?.option;
    return candidates.sort((a, b) => a.cost - b.cost || a.latency - b.latency)[0]?.option;
  }, [health, keyOptions, providerKeys, routerRecommendation.tier]);
  const routerOption = keyOptions.find((item) => item.value === (routerChoice || recommendedRouterOption?.value));
  const routerEstimate = routerOption
    ? findCatalogModel(routerOption.model, providerKeys.find((key) => key.id === routerOption.providerKeyId)?.providerSlug ?? "")
    : undefined;
  const routerCost = routerEstimate ? estimateCostUsd(routerEstimate, Math.ceil(councilDraft.length / 4), DEFAULT_ESTIMATED_OUTPUT_TOKENS) : null;
  const routerLatency = routerOption ? health.find((item) => item.providerSlug === providerKeys.find((key) => key.id === routerOption.providerKeyId)?.providerSlug)?.lastLatencyMs ?? null : null;

  const reload = async (): Promise<void> => {
    const list = await window.hub.prompts.list();
    setPrompts(list);
  };

  useEffect(() => {
    void reload().catch(() => setError(t("prompts.error.generic")));
  }, [t]);

  useEffect(() => {
    setSlots((current) => {
      if (current.some((slot) => slot.providerKeyId.length > 0)) {
        return current;
      }
      return defaultSlots(providerKeys);
    });
  }, [providerKeys]);

  useEffect(() => {
    const off = window.hub.chat.onEvent((event) => {
      setSlots((current) =>
        current.map((slot) => {
          if (event.type === "chunk") {
            return {
              ...slot,
              messages: slot.messages.map((message) =>
                message.id === event.messageId
                  ? { ...message, content: message.content + event.text, status: "streaming" as const }
                  : message,
              ),
            };
          }
          if (event.type === "done") {
            return {
              ...slot,
              runId: slot.runId === event.runId ? null : slot.runId,
              messages: slot.messages.map((message) => (message.id === event.message.id ? event.message : message)),
            };
          }
          return {
            ...slot,
            runId: slot.runId === event.runId ? null : slot.runId,
          };
        }),
      );
      if (event.type === "error" && event.code !== "aborted") {
        const mine = slotsRef.current.some(
          (slot) => slot.runId === event.runId || slot.messages.some((message) => message.id === event.messageId),
        );
        if (mine) {
          setError(t("prompts.error.run"));
        }
      }
    });
    return off;
  }, [t]);

  const selectPrompt = (item: PromptDto): void => {
    setSelectedId(item.id);
    setTitle(item.title);
    setBody(item.body);
    setFolder(item.folder);
  };

  const startNew = (): void => {
    setSelectedId(null);
    setTitle("");
    setBody("");
  };

  const savePrompt = async (): Promise<void> => {
    try {
      if (selectedId) {
        const updated = await window.hub.prompts.update({ id: selectedId, folder, title, body });
        setPrompts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setSelectedId(updated.id);
      } else {
        const created = await window.hub.prompts.create({ folder, title, body });
        setPrompts((current) => [...current, created]);
        setSelectedId(created.id);
      }
      setError(null);
    } catch {
      setError(t("prompts.error.save"));
    }
  };

  const insertPrompt = async (): Promise<void> => {
    const id = selectedId;
    if (!id) {
      return;
    }
    try {
      const resolved = await window.hub.prompts.resolve({ promptId: id, projectId: project?.id ?? null });
      onInsertIntoComposer(resolved.text);
    } catch {
      setError(t("prompts.error.resolve"));
    }
  };

  const runPlayground = async (): Promise<void> => {
    const ready = slots.filter((slot) => slot.providerKeyId.length > 0 && slot.model.length > 0);
    if (ready.length < 2) {
      setError(t("prompts.error.slots"));
      return;
    }
    const unique = new Set(ready.map((slot) => `${slot.providerKeyId}:${slot.model}`));
    if (unique.size !== ready.length) {
      setError(t("prompts.error.slots"));
      return;
    }
    let content = playgroundDraft.trim();
    if (selectedId) {
      try {
        const resolved = await window.hub.prompts.resolve({
          promptId: selectedId,
          projectId: project?.id ?? null,
        });
        content = content.length > 0 ? `${resolved.text}\n\n${content}` : resolved.text;
      } catch {
        setError(t("prompts.error.resolve"));
        return;
      }
    }
    if (content.length === 0) {
      setError(t("prompts.error.content"));
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const result: PlaygroundRunResult = await window.hub.playground.run({
        projectId: project?.id ?? null,
        content,
        privacyMode,
        slots: ready.map((slot) => ({ providerKeyId: slot.providerKeyId, model: slot.model })),
      });
      setSlots(
        result.slots.map((slot) => ({
          providerKeyId: slot.providerKeyId,
          model: slot.model,
          runId: slot.send.runId,
          messages: [slot.send.userMessage, slot.send.assistant].filter((item): item is MessageDto => item !== null),
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const cap = parseSpendCapError(message);
      if (cap) {
        setError(t("workspace.error.cap", { scope: t(`caps.scope.${cap}`) }));
      } else if (message.includes("playground:duplicate_slot") || message.includes("playground:busy")) {
        setError(t("prompts.error.slots"));
      } else if (classifyHubIpcError(message).kind === "unknown_model") {
        setError(t("workspace.error.unknownModel"));
      } else {
        setError(t("prompts.error.run"));
      }
    } finally {
      setRunning(false);
    }
  };

  const saveWinner = async (index: number): Promise<void> => {
    const slot = slots[index];
    const assistant = [...(slot?.messages ?? [])].reverse().find((item) => item.role === "assistant");
    if (!assistant || assistant.content.trim().length === 0) {
      return;
    }
    const name = winnerTitle.trim() || t("prompts.winnerDefault");
    try {
      const created = await window.hub.prompts.create({
        folder,
        title: name.slice(0, 120),
        body: assistant.content.slice(0, 16_000),
      });
      setPrompts((current) => [...current, created]);
      setSelectedId(created.id);
      setTitle(created.title);
      setBody(created.body);
      setError(null);
    } catch {
      setError(t("prompts.error.save"));
    }
  };

  const runCouncil = async (): Promise<void> => {
    if (!routerConfirmed || !conversationId || councilDraft.trim().length === 0 || keyOptions.length < 2) {
      setError(t("council.error.setup")); return;
    }
    const preferred = keyOptions.find((item) => item.value === routerChoice) ?? recommendedRouterOption ?? keyOptions[0];
    const selected = [preferred, ...keyOptions.filter((item) => item.value !== preferred?.value)].filter((item): item is NonNullable<typeof item> => item !== undefined).slice(0, Math.min(4, keyOptions.length));
    const roles = COUNCIL_ROLES.slice(0, selected.length);
    const synth = selected[0];
    if (!synth) return;
    setCouncilRunning(true); setError(null); setCouncilResult(null);
    try {
      const result = await window.hub.council.run({
        conversationId,
        projectId: project?.id ?? null,
        content: councilDraft.trim(),
        slots: selected.map((slot, index) => ({ providerKeyId: slot.providerKeyId, model: slot.model, role: roles[index] ?? "reviewer" })),
        synthesis: { providerKeyId: synth.providerKeyId, model: synth.model }, privacyMode,
      });
      const messages = await window.hub.messages.list({ conversationId });
      setCouncilResult({ divergences: result.divergences, synthesis: messages.find((item) => item.id === result.synthesis.send.messageId) ?? null, debate: result.slots.map((slot) => messages.find((item) => item.id === slot.send.messageId)).filter((item): item is MessageDto => item !== undefined) });
    } catch { setError(t("council.error.run")); } finally { setCouncilRunning(false); }
  };

  return (
    <div className="flex h-full min-h-0" data-testid="prompts-view">
      <aside className="flex w-64 shrink-0 flex-col border-r">
        <div className="flex items-center justify-between border-b px-2 py-1.5">
          <p className="text-[12px] font-medium">{t("prompts.library")}</p>
          <Button type="button" size="sm" data-testid="prompt-new" onClick={startNew}>
            {t("prompts.new")}
          </Button>
        </div>
        <div className="flex gap-1 border-b px-2 py-1">
          {PROMPT_FOLDERS.map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={folder === item ? "default" : "ghost"}
              data-testid={`prompt-folder-${item}`}
              onClick={() => setFolder(item)}
            >
              {t(`prompts.folder.${item}`)}
            </Button>
          ))}
        </div>
        <ScrollArea className="flex-1">
          <ul className="p-1" data-testid="prompt-list">
            {folderPrompts.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`w-full rounded px-2 py-1 text-left text-[12px] ${
                    item.id === selectedId ? "bg-muted" : "hover:bg-muted/60"
                  }`}
                  data-testid="prompt-item"
                  data-factory={item.factoryId ?? ""}
                  onClick={() => selectPrompt(item)}
                >
                  {item.factoryId ? t(`prompts.factory.${item.factoryId}`) : item.title}
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="grid min-h-0 flex-1 grid-cols-2">
          <div className="flex min-h-0 flex-col border-r p-2">
            <p className="mb-1 text-[12px] font-medium">{t("prompts.editor")}</p>
            <Input
              className="mb-1"
              data-testid="prompt-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("prompts.titlePlaceholder")}
            />
            <textarea
              className="mb-2 min-h-[160px] flex-1 resize-none rounded border bg-background p-2 text-[12px]"
              data-testid="prompt-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t("prompts.bodyPlaceholder")}
            />
            <div className="flex flex-wrap gap-1">
              <Button type="button" size="sm" data-testid="prompt-save" onClick={() => void savePrompt()}>
                {t("prompts.save")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                data-testid="prompt-insert"
                disabled={!selectedId}
                onClick={() => void insertPrompt()}
              >
                {t("prompts.insert")}
              </Button>
              {selectedId && !selected?.factoryId ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  data-testid="prompt-delete"
                  onClick={() => {
                    void window.hub.prompts.remove({ id: selectedId }).then(() => {
                      setPrompts((current) => current.filter((item) => item.id !== selectedId));
                      startNew();
                    });
                  }}
                >
                  {t("prompts.delete")}
                </Button>
              ) : null}
            </div>
          </div>
          <div className="flex min-h-0 flex-col p-2">
            <p className="mb-1 text-[12px] font-medium">{t("prompts.playground")}</p>
            <textarea
              className="mb-2 h-20 resize-none rounded border bg-background p-2 text-[12px]"
              data-testid="playground-extra"
              value={playgroundDraft}
              onChange={(event) => setPlaygroundDraft(event.target.value)}
              placeholder={t("prompts.playgroundPlaceholder")}
            />
            <div className="mb-2 flex flex-wrap items-center gap-1">
              {slots.map((slot, index) => (
                <label key={index} className="flex items-center gap-1 text-[11px]">
                  <span className="text-muted-foreground">{t("prompts.slot", { n: index + 1 })}</span>
                  <select
                    className="h-8 rounded border bg-background px-1"
                    data-testid={`playground-model-${index}`}
                    value={slot.providerKeyId && slot.model ? `${slot.providerKeyId}::${slot.model}` : ""}
                    onChange={(event) => {
                      const option = keyOptions.find((item) => item.value === event.target.value);
                      if (!option) {
                        return;
                      }
                      setSlots((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, providerKeyId: option.providerKeyId, model: option.model }
                            : row,
                        ),
                      );
                    }}
                  >
                    {keyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <Button
                type="button"
                size="sm"
                data-testid="playground-run"
                disabled={running}
                onClick={() => void runPlayground()}
              >
                {running ? t("prompts.running") : t("prompts.run")}
              </Button>
            </div>
            <div className="mt-3 border-t pt-2" data-testid="council-panel">
              <p className="mb-1 text-[12px] font-medium">{t("council.title")}</p>
              <textarea className="mb-1 h-16 w-full resize-none rounded border bg-background p-2 text-[12px]" value={councilDraft} onChange={(event) => setCouncilDraft(event.target.value)} placeholder={t("council.placeholder")} data-testid="council-input" />
              <p className="mb-1 text-[11px] text-muted-foreground">{t(`council.router.${routerRecommendation.reason}`)}</p>
              <select aria-label={t("council.router.model")} className="mb-1 h-8 w-full rounded border bg-background px-1 text-[11px]" value={routerChoice || recommendedRouterOption?.value || ""} onChange={(event) => { setRouterChoice(event.target.value); setRouterConfirmed(false); }} data-testid="router-choice">{keyOptions.map((item) => <option key={item.value} value={item.value}>{item.label}{item.value === recommendedRouterOption?.value ? ` · ${t("council.router.recommended")}` : ""}</option>)}</select>
              <p className="mb-1 text-[11px] text-muted-foreground">{t("council.router.cost", { usd: routerCost ?? "—" })} · {routerLatency === null ? t(`council.router.speed.${routerRecommendation.tier}`) : t("council.router.latency", { ms: routerLatency })}</p>
              <div className="flex gap-1"><Button size="sm" type="button" variant="outline" onClick={() => setRouterConfirmed(false)}>{t("council.router.reject")}</Button><Button size="sm" type="button" variant="secondary" onClick={() => setRouterConfirmed(true)}>{t("council.router.confirm")}</Button><Button size="sm" type="button" disabled={councilRunning || !conversationId || !routerConfirmed} onClick={() => void runCouncil()} data-testid="council-run">{councilRunning ? t("council.running") : t("council.run")}</Button></div>
              {councilResult ? <div className="mt-2 rounded border p-2 text-[11px]"><p>{t("council.divergences")}: {councilResult.divergences.join(", ") || t("council.none")}</p><div className="mt-2 grid grid-cols-2 gap-2">{councilResult.debate.map((message, index) => <div key={message.id} className="min-w-0 rounded border p-1"><p className="font-medium">{COUNCIL_ROLES[index] ?? t("prompts.slot", { n: index + 1 })}</p><p className="whitespace-pre-wrap">{message.content}</p></div>)}</div><p className="mt-2 font-medium">{t("council.synthesis")}</p><p className="whitespace-pre-wrap">{councilResult.synthesis?.content}</p></div> : null}
            </div>
            <Input
              className="mb-2"
              data-testid="playground-winner-title"
              value={winnerTitle}
              onChange={(event) => setWinnerTitle(event.target.value)}
              placeholder={t("prompts.winnerPlaceholder")}
            />
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
              {slots.map((slot, index) => {
                const assistant = [...slot.messages].reverse().find((item) => item.role === "assistant");
                return (
                  <div
                    key={index}
                    className="flex min-h-0 flex-col rounded border"
                    data-testid={`playground-slot-${index}`}
                  >
                    <div className="flex items-center justify-between border-b px-2 py-1 text-[11px]">
                      <span className="truncate">{slot.model}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        data-testid={`playground-save-${index}`}
                        disabled={!assistant || assistant.status !== "complete"}
                        onClick={() => void saveWinner(index)}
                      >
                        {t("prompts.saveWinner")}
                      </Button>
                    </div>
                    <ScrollArea className="flex-1 p-2">
                      <p
                        className="whitespace-pre-wrap text-[12px]"
                        data-testid={`playground-assistant-${index}`}
                        data-status={assistant?.status ?? "idle"}
                      >
                        {assistant?.content ?? t("prompts.playgroundEmpty")}
                      </p>
                    </ScrollArea>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {error ? (
          <p className="border-t px-2 py-1 text-[12px] text-destructive" data-testid="prompts-error">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
