import { type JSX, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImportEvent, ImportReport, ImportSourceDto, ProjectDto } from "@ai-hub/shared";
import { Button } from "@/components/ui/button";

export function ImportView({
  projects,
  onImported,
}: {
  projects: ProjectDto[];
  onImported: (destination: { projectId: string | null; importedInbox: boolean }) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [source, setSource] = useState<ImportSourceDto>("chatgpt");
  const [projectId, setProjectId] = useState<string>("inbox");
  const [ticket, setTicket] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number; ok: number; skipped: number } | null>(
    null,
  );
  const [report, setReport] = useState<ImportReport | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const jobIdRef = useRef<string | null>(null);

  useEffect(() => {
    return window.hub.import.onEvent((event: ImportEvent) => {
      if (jobIdRef.current && event.jobId && event.jobId !== jobIdRef.current) {
        return;
      }
      if (event.type === "progress") {
        setProgress({
          processed: event.processed,
          total: event.total,
          ok: event.ok,
          skipped: event.skipped,
        });
        return;
      }
      if (event.type === "done") {
        setReport(event.report);
        setBusy(false);
        setJobId(null);
        jobIdRef.current = null;
        setProgress(null);
        return;
      }
      setErrorKey(`import.error.${event.code}`);
      setBusy(false);
      setJobId(null);
      jobIdRef.current = null;
    });
  }, []);

  const pickFile = async (): Promise<void> => {
    setErrorKey(null);
    setReport(null);
    try {
      const result = await window.hub.import.pickFile();
      if (result.status === "cancelled") {
        return;
      }
      setTicket(result.ticket);
      setFileName(result.fileName);
    } catch {
      setErrorKey("import.error.generic");
    }
  };

  const start = async (): Promise<void> => {
    if (!ticket) {
      return;
    }
    setBusy(true);
    setReport(null);
    setProgress(null);
    setErrorKey(null);
    try {
      const started = await window.hub.import.start({
        ticket,
        source,
        projectId: projectId === "inbox" ? null : projectId,
      });
      jobIdRef.current = started.jobId;
      setJobId(started.jobId);
      setTicket(null);
    } catch {
      setBusy(false);
      setErrorKey("import.error.generic");
    }
  };

  const cancel = async (): Promise<void> => {
    if (!jobId) {
      return;
    }
    try {
      await window.hub.import.cancel({ jobId });
    } catch {
      setErrorKey("import.error.generic");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6">
      <div>
        <h1 className="text-base font-semibold">{t("import.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("import.hint")}</p>
      </div>
      <label className="flex flex-col gap-1 text-[12px] font-medium">
        {t("import.source")}
        <select
          className="h-8 rounded-md border bg-background px-2 text-[13px] font-normal"
          value={source}
          data-testid="import-source"
          onChange={(event) => setSource(event.target.value as ImportSourceDto)}
        >
          <option value="chatgpt">{t("import.source.chatgpt")}</option>
          <option value="claude">{t("import.source.claude")}</option>
          <option value="gemini">{t("import.source.gemini")}</option>
        </select>
      </label>
      {source === "gemini" ? <p className="text-[12px] text-muted-foreground">{t("import.geminiLimits")}</p> : null}
      <label className="flex flex-col gap-1 text-[12px] font-medium">
        {t("import.destination")}
        <select
          className="h-8 rounded-md border bg-background px-2 text-[13px] font-normal"
          value={projectId}
          data-testid="import-destination"
          onChange={(event) => setProjectId(event.target.value)}
        >
          <option value="inbox">{t("import.destination.inbox")}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void pickFile()} disabled={busy} data-testid="import-pick-file">
          {t("import.pickFile")}
        </Button>
        <Button type="button" disabled={!ticket || busy} onClick={() => void start()} data-testid="import-start">
          {t("import.start")}
        </Button>
        <Button type="button" variant="outline" disabled={!jobId} onClick={() => void cancel()} data-testid="import-cancel">
          {t("import.cancel")}
        </Button>
      </div>
      {fileName ? (
        <p className="text-[12px] text-muted-foreground" data-testid="import-file-name">
          {t("import.fileName", { name: fileName })}
        </p>
      ) : (
        <p className="text-[12px] text-muted-foreground">{t("import.empty")}</p>
      )}
      {progress ? (
        <p className="text-[12px]" data-testid="import-progress" data-status="running">
          {t("import.progress", { current: progress.processed, total: progress.total })}
        </p>
      ) : null}
      {report ? (
        <div className="rounded-md border p-3 text-[13px]" data-testid="import-report" data-ok={report.ok} data-skipped={report.skipped}>
          <p className="font-medium">{t("import.report.title")}</p>
          <p>{t("import.report.ok", { count: report.ok })}</p>
          <p>{t("import.report.skipped", { count: report.skipped })}</p>
          <p>{t("import.report.errors", { count: report.errors.length })}</p>
          {report.errors.length > 0 ? (
            <ul className="mt-1 list-disc pl-4 text-muted-foreground">
              {[...new Set(report.errors.map((item) => item.reason))].map((reason) => (
                <li key={reason}>{t(`import.report.error.${reason}`)}</li>
              ))}
            </ul>
          ) : null}
          {report.attachmentsSkipped > 0 ? (
            <p>{t("import.report.attachments", { count: report.attachmentsSkipped })}</p>
          ) : null}
          <Button
            type="button"
            className="mt-2"
            data-testid="import-open-destination"
            onClick={() =>
              onImported({
                projectId: projectId === "inbox" ? null : projectId,
                importedInbox: projectId === "inbox",
              })
            }
          >
            {t("import.openDestination")}
          </Button>
        </div>
      ) : null}
      {errorKey ? (
        <p className="text-destructive" role="alert" data-testid="import-error">
          {t(errorKey)}
        </p>
      ) : null}
    </div>
  );
}
