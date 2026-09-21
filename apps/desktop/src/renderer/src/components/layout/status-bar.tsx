import { type JSX } from "react";
import { useTranslation } from "react-i18next";
import type { HealthSummaryDto } from "@ai-hub/shared";
import { useTheme } from "@/lib/theme";

function healthState(summary: HealthSummaryDto): "ok" | "down" | "unknown" {
  if (summary.lastOk === true) {
    return "ok";
  }
  if (summary.lastOk === false) {
    return "down";
  }
  return "unknown";
}

export function StatusBar({
  health,
  runHud,
  onOpenShortcuts,
}: {
  health: HealthSummaryDto[];
  runHud: { tokensIn: number | null; tokensOut: number | null; tokensThinking: number | null; cacheReadTokens: number | null; cacheWriteTokens: number | null; costUsd: string | null; thinkingSupported: boolean | null } | null;
  onOpenShortcuts: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const modifier = window.hub.platform === "darwin" ? "⌘" : "Ctrl";

  return (
    <footer className="flex h-6 shrink-0 items-center justify-between gap-3 border-t bg-background px-3 text-[11px] text-muted-foreground">
      <span className="truncate" data-testid="status-health">
        {health.length === 0
          ? t("status.health.empty")
          : health
              .map((item) => {
                const state = healthState(item);
                return t("status.health.item", {
                  provider: item.providerSlug,
                  state: t(`status.health.${state}`),
                  latency:
                    item.lastLatencyMs === null
                      ? ""
                      : t("status.health.latency", { ms: item.lastLatencyMs }),
                  errors:
                    item.sampleCount === 0
                      ? ""
                      : t("status.health.errors", {
                          pct: Math.round(item.errorRate * 100),
                        }),
                });
              })
              .join(" · ")}
      </span>
      <span className="truncate" data-testid="status-usage">
        {runHud ? `tokens ${runHud.tokensIn ?? "—"}/${runHud.tokensOut ?? "—"} · thinking ${runHud.tokensThinking ?? "—"} · cache ${runHud.cacheReadTokens ?? "—"}/${runHud.cacheWriteTokens ?? "—"} · $${runHud.costUsd ?? "—"}` : ""}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          className="rounded px-1 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          data-testid="shortcuts-open"
          onClick={onOpenShortcuts}
        >
          {t("shortcuts.status", { modifier })}
        </button>
        <span>{t("status.theme", { theme: t(`theme.${theme}`) })}</span>
      </span>
    </footer>
  );
}
