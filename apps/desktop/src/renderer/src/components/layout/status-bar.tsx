import { type JSX } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";

export function StatusBar(): JSX.Element {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <footer className="flex h-6 shrink-0 items-center justify-between border-t bg-background px-3 text-[11px] text-muted-foreground">
      <span>{t("status.ready")}</span>
      <span>{t("status.theme", { theme: t(`theme.${theme}`) })}</span>
    </footer>
  );
}
