import { type JSX, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DebugSnapshot } from "@ai-hub/shared";
import { Button } from "@/components/ui/button";

export function DebugView(): JSX.Element {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<DebugSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = (): void => {
    void window.hub.debug
      .getLatest()
      .then((next) => {
        setSnapshot(next);
        setError(null);
      })
      .catch(() => setError(t("workspace.error.generic")));
  };

  useEffect(() => {
    void window.hub.debug
      .getLatest()
      .then((next) => {
        setSnapshot(next);
        setError(null);
      })
      .catch(() => setError(t("workspace.error.generic")));
  }, [t]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6">
      <div>
        <h1 className="text-base font-semibold">{t("debug.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("debug.hint")}</p>
      </div>
      <Button type="button" variant="outline" onClick={reload} data-testid="debug-refresh">
        {t("debug.refresh")}
      </Button>
      {snapshot ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]" data-testid="debug-snapshot">
          <dt className="text-muted-foreground">{t("debug.at")}</dt>
          <dd>{snapshot.at}</dd>
          <dt className="text-muted-foreground">{t("debug.provider")}</dt>
          <dd>{snapshot.provider}</dd>
          <dt className="text-muted-foreground">{t("debug.model")}</dt>
          <dd>{snapshot.model}</dd>
          <dt className="text-muted-foreground">{t("debug.retries")}</dt>
          <dd>{snapshot.retries}</dd>
          <dt className="text-muted-foreground">{t("debug.error")}</dt>
          <dd>{snapshot.lastErrorCode ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("debug.tokens")}</dt>
          <dd>{snapshot.tokenEstimate}</dd>
          <dt className="text-muted-foreground">{t("debug.cost")}</dt>
          <dd>{snapshot.estimatedCostUsd ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("debug.cap")}</dt>
          <dd>
            {snapshot.capDecision}
            {snapshot.capScope ? ` · ${snapshot.capScope}` : ""}
          </dd>
          <dt className="text-muted-foreground">{t("debug.overflow")}</dt>
          <dd>{String(snapshot.overflow)}</dd>
        </dl>
      ) : (
        <p className="text-muted-foreground">{t("debug.empty")}</p>
      )}
      {error ? (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
