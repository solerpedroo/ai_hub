import { type JSX, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  artifactFrameSrc,
  detectArtifacts,
  type ArtifactDto,
} from "@ai-hub/shared";
import { MessageMarkdown } from "@/components/chat/message-markdown";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ArtifactCanvas({
  artifact,
  versions,
  busy,
  onClose,
  onSelectVersion,
  onSaveVersion,
  onPin,
  onExport,
}: {
  artifact: ArtifactDto;
  versions: ArtifactDto[];
  busy: boolean;
  onClose: () => void;
  onSelectVersion: (id: string) => void;
  onSaveVersion: (body: string) => Promise<void>;
  onPin: (pinned: boolean) => Promise<void>;
  onExport: (format: "md" | "html" | "svg", svg?: string) => Promise<void>;
}): JSX.Element {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(artifact.body);
  const [copied, setCopied] = useState(false);
  const [hasSvg, setHasSvg] = useState(false);
  const svgRef = useRef<string | null>(null);

  useEffect(() => {
    setDraft(artifact.body);
    setHasSvg(false);
    svgRef.current = null;
  }, [artifact.id, artifact.body]);

  const dirty = draft !== artifact.body;
  const family = useMemo(
    () => versions.filter((item) => item.familyId === artifact.familyId).sort((a, b) => a.version - b.version),
    [artifact.familyId, versions],
  );

  return (
    <aside className="flex min-h-0 w-[42%] min-w-[20rem] shrink-0 flex-col border-l" data-testid="artifact-canvas">
      <div className="flex items-center justify-between gap-1 border-b px-2 py-1.5">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium" data-testid="artifact-title">
            {artifact.title}
          </p>
          <p className="text-[11px] text-muted-foreground" data-testid="artifact-kind">
            {t(`artifacts.kind.${artifact.kind}`)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <select
            className="h-7 rounded-md border bg-background px-1 text-[11px]"
            data-testid="artifact-version"
            value={artifact.id}
            disabled={busy}
            onChange={(event) => onSelectVersion(event.target.value)}
          >
            {family.map((item) => (
              <option key={item.id} value={item.id}>
                {t("artifacts.version", { n: item.version })}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" variant="ghost" data-testid="artifact-close" onClick={onClose}>
            {t("artifacts.close")}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 border-b px-2 py-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="artifact-copy"
          onClick={() => {
            void navigator.clipboard.writeText(draft).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1200);
            });
          }}
        >
          {copied ? t("workspace.copied") : t("workspace.copy")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="artifact-save"
          disabled={busy || !dirty}
          onClick={() => {
            void onSaveVersion(draft);
          }}
        >
          {t("artifacts.saveVersion")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="artifact-pin"
          disabled={busy}
          aria-pressed={artifact.pinned}
          onClick={() => {
            void onPin(!artifact.pinned);
          }}
        >
          {artifact.pinned ? t("artifacts.unpin") : t("artifacts.pin")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="artifact-export-md"
          disabled={busy}
          onClick={() => {
            void onExport("md");
          }}
        >
          {t("artifacts.exportMd")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="artifact-export-html"
          disabled={busy}
          onClick={() => {
            void onExport("html");
          }}
        >
          {t("artifacts.exportHtml")}
        </Button>
        {artifact.kind === "mermaid" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="artifact-export-svg"
            disabled={busy || !hasSvg}
            onClick={() => {
              const svg = svgRef.current;
              if (!svg) {
                return;
              }
              void onExport("svg", svg);
            }}
          >
            {t("artifacts.exportSvg")}
          </Button>
        ) : null}
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-2">
        <textarea
          className="min-h-0 resize-none border-b bg-background p-2 font-mono text-[12px] outline-none"
          data-testid="artifact-editor"
          spellCheck={false}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <ScrollArea className="min-h-0 p-2">
          {artifact.kind === "mermaid" ? (
            <MermaidPreview
              source={draft}
              onSvg={(svg) => {
                svgRef.current = svg.length > 0 ? svg : null;
                setHasSvg(svg.length > 0);
              }}
            />
          ) : artifact.kind === "html" ? (
            dirty ? (
              <p className="text-[12px] text-muted-foreground">{t("artifacts.htmlSaveToPreview")}</p>
            ) : (
              <iframe
                sandbox="allow-scripts"
                src={artifactFrameSrc(artifact.id)}
                title={artifact.title}
                className="h-full min-h-[12rem] w-full rounded-md bg-white"
                data-testid="artifact-html-frame"
              />
            )
          ) : artifact.kind === "code" ? (
            <MessageMarkdown
              content={`\`\`\`${artifact.language ?? ""}\n${draft}\n\`\`\``}
            />
          ) : (
            <MessageMarkdown content={draft} />
          )}
        </ScrollArea>
      </div>
    </aside>
  );
}

export function messageHasArtifacts(content: string): boolean {
  return detectArtifacts(content).length > 0;
}

function MermaidPreview({
  source,
  onSvg,
}: {
  source: string;
  onSvg: (svg: string) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const onSvgRef = useRef(onSvg);
  onSvgRef.current = onSvg;
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const mermaid = (await import("mermaid")).default;
          mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "dark" });
          const id = `mmd${crypto.randomUUID().replace(/-/g, "")}`;
          const { svg: rendered } = await mermaid.render(id, source);
          if (cancelled) {
            return;
          }
          setSvg(rendered);
          onSvgRef.current(rendered);
          setError(null);
        } catch {
          if (!cancelled) {
            setSvg(null);
            onSvgRef.current("");
            setError(t("artifacts.mermaidError"));
          }
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [source, t]);

  const srcDoc = svg
    ? `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0">${svg}</body></html>`
    : "";

  return (
    <div>
      {error ? (
        <p className="text-[12px] text-muted-foreground" data-testid="artifact-mermaid-error">
          {error}
        </p>
      ) : null}
      <iframe
        sandbox=""
        srcDoc={srcDoc}
        title="Mermaid"
        className="h-full min-h-[12rem] w-full border-0 bg-transparent"
        data-testid="artifact-mermaid"
      />
    </div>
  );
}
