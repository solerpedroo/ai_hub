import { type FormEvent, type JSX, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AppLocale, ProviderDto, ProviderKeyDto, ThemeMode } from "@ai-hub/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { persistLocale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export function SettingsView(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [providers, setProviders] = useState<ProviderDto[]>([]);
  const [keys, setKeys] = useState<ProviderKeyDto[]>([]);
  const [providerSlug, setProviderSlug] = useState("openrouter");
  const [label, setLabel] = useState("default");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reloadKeys = (): void => {
    void window.hub.secrets
      .list()
      .then(setKeys)
      .catch(() => setError(t("workspace.error.generic")));
  };

  useEffect(() => {
    let cancelled = false;
    void window.hub.providers
      .list()
      .then((list) => {
        if (cancelled) {
          return;
        }
        setProviders(list);
        const first = list[0];
        if (first) {
          setProviderSlug(first.slug);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(t("workspace.error.generic"));
        }
      });
    void window.hub.secrets
      .list()
      .then((list) => {
        if (!cancelled) {
          setKeys(list);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(t("workspace.error.generic"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const setLocale = (locale: AppLocale): void => {
    persistLocale(locale);
  };

  const onSaveKey = (event: FormEvent): void => {
    event.preventDefault();
    const value = secret;
    setSecret("");
    void window.hub.secrets
      .save({ providerSlug, label, secret: value })
      .then(() => {
        setError(null);
        reloadKeys();
      })
      .catch(() => setError(t("secrets.error.save")));
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
        <h2 className="text-[12px] font-medium">{t("secrets.title")}</h2>
        <p className="text-muted-foreground">{t("secrets.hint")}</p>
        <form className="flex flex-col gap-2" onSubmit={onSaveKey}>
          <label className="flex flex-col gap-1 text-[12px]">
            {t("secrets.provider")}
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-[13px]"
              value={providerSlug}
              onChange={(event) => setProviderSlug(event.target.value)}
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.slug}>
                  {provider.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px]">
            {t("secrets.labelField")}
            <Input value={label} onChange={(event) => setLabel(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-[12px]">
            {t("secrets.secret")}
            <Input
              type="password"
              autoComplete="off"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
            />
          </label>
          <Button type="submit">{t("secrets.save")}</Button>
        </form>
        <ul className="flex flex-col gap-1">
          {keys.map((key) => (
            <li key={key.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1">
              <span>
                {key.providerSlug} · {key.label} · {key.maskedKey}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void window.hub.secrets
                    .remove({ id: key.id })
                    .then(() => reloadKeys())
                    .catch(() => setError(t("workspace.error.generic")));
                }}
              >
                {t("secrets.remove")}
              </Button>
            </li>
          ))}
        </ul>
        {error ? (
          <p className="text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
