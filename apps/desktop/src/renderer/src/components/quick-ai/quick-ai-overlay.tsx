import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import { estimateCostUsd, findCatalogModel, inspectClipboardText, typescriptInterfaceFromJson, type ProviderKeyDto } from "@ai-hub/shared";
import { Button } from "@/components/ui/button";

export function QuickAiOverlay(): JSX.Element {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = useState("");
  const [keys, setKeys] = useState<ProviderKeyDto[]>([]);
  const [keyId, setKeyId] = useState<string | null>(null);
  const [model, setModel] = useState("gpt-4o-mini");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [sendToProject, setSendToProject] = useState(false);
  const [answer, setAnswer] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const runIdRef = useRef<string | null>(null);
  const [estimate, setEstimate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const insight = useMemo(() => inspectClipboardText(text), [text]);

  useEffect(() => {
    void Promise.all([window.hub.secrets.list(), window.hub.settings.getSession()]).then(([listed, session]) => {
      const active = listed.filter((item) => item.status === "active");
      setKeys(active); setKeyId(active[0]?.id ?? null); setModel(session.model); setProjectId(session.projectId);
    });
    const off = window.hub.quickAi.onPrefill((value) => { setText(value); inputRef.current?.focus(); });
    return () => off();
  }, []);

  useEffect(() => window.hub.chat.onEvent((event) => {
    if (event.runId !== runId) return;
    if (event.type === "chunk") setAnswer((current) => current + event.text);
    if (event.type === "done") { setAnswer(event.message.content); setRunId(null); }
    if (event.type === "error") { setRunId(null); setError(t(`workspace.error.${event.code}`)); }
  }), [runId, t]);

  useEffect(() => { runIdRef.current = runId; }, [runId]);
  useEffect(() => () => { if (runIdRef.current) void window.hub.chat.abort({ runId: runIdRef.current }); }, []);

  useEffect(() => {
    const key = keys.find((item) => item.id === keyId);
    const catalog = key ? findCatalogModel(model, key.providerSlug) : null;
    if (!catalog || text.trim().length === 0) { setEstimate(null); return; }
    setEstimate(estimateCostUsd(catalog, Math.ceil(text.length / 4), 1_024));
  }, [keyId, keys, model, text]);

  const send = async (): Promise<void> => {
    const key = keys.find((item) => item.id === keyId);
    if (!key || !text.trim()) { setError(t("quickAi.error.setup")); return; }
    try {
      setError(null); setAnswer("");
      const conversation = await window.hub.conversations.create({ projectId: sendToProject ? projectId : null, title: t("quickAi.conversationTitle") });
      const result = await window.hub.chat.send({ mode: "send", conversationId: conversation.id, providerKeyId: key.id, model, content: text.trim() });
      setRunId(result.runId);
    } catch { setError(t("quickAi.error.send")); }
  };

  const readClipboard = async (): Promise<void> => { setText(await window.hub.quickAi.readClipboard()); inputRef.current?.focus(); };
  const useInterface = (): void => { const value = typescriptInterfaceFromJson(text); if (value) setText(value); };
  const explain = (): void => setText(insight.kind === "stack_trace" ? `${t("quickAi.diagnosePrefix")}\n\n${text}` : `${t("quickAi.explainPrefix")}\n\n${text}`);

  return <main className="quick-ai h-full overflow-auto p-4" data-testid="quick-ai-overlay">
    <div className="mx-auto max-w-2xl space-y-3 rounded-lg border bg-card p-4 shadow-2xl">
      <div className="flex items-center justify-between gap-3"><h1 className="font-semibold">{t("quickAi.title")}</h1><Button variant="ghost" size="sm" onClick={() => void window.hub.window.close()}>{t("quickAi.close")}</Button></div>
      <textarea ref={inputRef} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} className="min-h-24 w-full resize-y rounded-md border bg-background p-3" placeholder={t("quickAi.placeholder")} data-testid="quick-ai-input" autoFocus />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => void readClipboard()}>{t("quickAi.clipboard")}</Button>
        {insight.kind === "json" ? <><Button type="button" size="sm" variant="outline" onClick={() => insight.formatted && setText(insight.formatted)}>{t("quickAi.formatJson")}</Button><Button type="button" size="sm" variant="outline" onClick={useInterface}>{t("quickAi.toInterface")}</Button><Button type="button" size="sm" variant="outline" onClick={explain}>{t("quickAi.explainJson")}</Button></> : null}
        {insight.kind === "stack_trace" ? <Button type="button" size="sm" variant="outline" onClick={explain}>{t("quickAi.diagnoseStack")}</Button> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs"><label><input type="checkbox" checked={sendToProject} disabled={!projectId} onChange={(event) => setSendToProject(event.target.checked)} /> {t("quickAi.sendToProject")}</label><select value={keyId ?? ""} onChange={(event) => setKeyId(event.target.value || null)}>{keys.map((key) => <option key={key.id} value={key.id}>{key.label} · {key.providerSlug}</option>)}</select><input value={model} onChange={(event) => setModel(event.target.value)} aria-label={t("quickAi.model")} className="w-36 rounded border bg-background px-2 py-1" /></div>
      <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{estimate ? t("quickAi.estimate", { usd: estimate }) : t("quickAi.estimateUnavailable")}</span>{runId ? <Button variant="outline" onClick={() => void window.hub.chat.abort({ runId })}>{t("quickAi.cancel")}</Button> : <Button onClick={() => void send()} disabled={!text.trim()}>{t("quickAi.send")}</Button>}</div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {answer ? <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs" data-testid="quick-ai-answer">{answer}</pre> : null}
    </div>
  </main>;
}
