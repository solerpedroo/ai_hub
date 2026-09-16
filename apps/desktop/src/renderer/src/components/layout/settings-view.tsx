import { type JSX } from "react";
import { useTranslation } from "react-i18next";
import type { AppLocale, ThemeMode } from "@ai-hub/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { persistLocale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export function SettingsView(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const setLocale = (locale: AppLocale): void => {
    persistLocale(locale);
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div>
        <h1 className="text-base font-semibold">{t("settings.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("settings.hint")}</p>
      </div>
      <section className="flex flex-col gap-2">
        <p className="text-[12px] font-medium">{t("theme.label")}</p>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((mode: ThemeMode) => (
            <Button
              key={mode}
              type="button"
              variant={theme === mode ? "default" : "outline"}
              onClick={() => setTheme(mode)}
            >
              {t(`theme.${mode}`)}
            </Button>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <p className="text-[12px] font-medium">{t("locale.label")}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={i18n.language === "pt-BR" ? "default" : "outline"}
            onClick={() => setLocale("pt-BR")}
          >
            {t("locale.ptBR")}
          </Button>
          <Button
            type="button"
            variant={i18n.language.startsWith("en") ? "default" : "outline"}
            onClick={() => setLocale("en")}
          >
            {t("locale.en")}
          </Button>
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <Input readOnly value={t("app.name")} aria-label={t("app.name")} />
      </section>
    </div>
  );
}
