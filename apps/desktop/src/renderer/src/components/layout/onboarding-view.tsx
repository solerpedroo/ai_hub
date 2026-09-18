import { type FormEvent, type JSX, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AppLocale, ProviderDto, ProviderKeyDto, SecretsTestResult } from "@ai-hub/shared";
import { sortProvidersForWizard } from "@ai-hub/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { persistLocale } from "@/lib/i18n";

export function OnboardingView({
  onComplete,
}: {
  onComplete: (key: ProviderKeyDto) => void;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<"locale" | "provider">("locale");
  const [providers, setProviders] = useState<ProviderDto[]>([]);
  const [providerSlug, setProviderSlug] = useState("openrouter");
  const [secret, setSecret] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://127.0.0.1:11434/v1");
  const [savedKey, setSavedKey] = useState<ProviderKeyDto | null>(null);
  const [testResult, setTestResult] = useState<SecretsTestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void window.hub.providers
      .list()
      .then((list) => {
        if (cancelled) {
          return;
        }
        const ordered = sortProvidersForWizard(list);
        setProviders(ordered);
        const featured = ordered.find((item) => item.slug === "openrouter") ?? ordered[0];
        if (featured) {
          setProviderSlug(featured.slug);
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

  const onSaveAndTest = (event: FormEvent): void => {
    event.preventDefault();
    const value = secret.trim();
    if (value.length === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    const payload =
      providerSlug === "custom"
        ? { providerSlug, label: "default", secret: value, baseUrl }
        : { providerSlug, label: "default", secret: value };
    void window.hub.secrets
      .save(payload)
      .then((key) => {
        setSecret("");
        setSavedKey(key);
        return window.hub.secrets.test({ id: key.id }).then((result) => {
          setTestResult(result);
          if (!result.ok) {
            setError(t("secrets.testFail", { code: result.errorCode ?? "unknown", ms: result.latencyMs }));
          }
          return key;
        });
      })
      .catch(() => setError(t("secrets.error.save")))
      .finally(() => setBusy(false));
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-8" data-testid="onboarding">
      <div>
        <h1 className="text-base font-semibold">{t("onboarding.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("onboarding.hint")}</p>
      </div>
      {step === "locale" ? (
        <section className="flex flex-col gap-3">
          <p className="text-[12px] font-medium">{t("locale.label")}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={i18n.language === "pt-BR" ? "default" : "outline"}
              data-testid="onboarding-locale-pt"
              onClick={() => persistLocale("pt-BR" satisfies AppLocale)}
            >
              {t("locale.ptBR")}
            </Button>
            <Button
              type="button"
              variant={i18n.language.startsWith("en") ? "default" : "outline"}
              data-testid="onboarding-locale-en"
              onClick={() => persistLocale("en")}
            >
              {t("locale.en")}
            </Button>
          </div>
          <Button type="button" data-testid="onboarding-locale-next" onClick={() => setStep("provider")}>
            {t("onboarding.next")}
          </Button>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <p className="text-[12px] font-medium">{t("onboarding.provider")}</p>
          <p className="text-muted-foreground">{t("onboarding.providerHint")}</p>
          <form className="flex flex-col gap-2" onSubmit={onSaveAndTest}>
            <label className="flex flex-col gap-1 text-[12px]">
              {t("secrets.provider")}
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-[13px]"
                value={providerSlug}
                onChange={(event) => {
                  setProviderSlug(event.target.value);
                  setSavedKey(null);
                  setTestResult(null);
                }}
                data-testid="onboarding-provider"
                aria-label={t("secrets.provider")}
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.slug}>
                    {provider.slug === "openrouter"
                      ? t("onboarding.openrouter", { name: provider.name })
                      : provider.name}
                  </option>
                ))}
              </select>
            </label>
            {providerSlug === "custom" ? (
              <label className="flex flex-col gap-1 text-[12px]">
                {t("secrets.baseUrl")}
                <Input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  autoComplete="off"
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-[12px]">
              {t("secrets.secret")}
              <Input
                type="password"
                autoComplete="off"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                data-testid="onboarding-secret"
              />
            </label>
            <Button type="submit" disabled={busy || secret.trim().length === 0} data-testid="onboarding-save-test">
              {busy ? t("secrets.testing") : t("onboarding.saveTest")}
            </Button>
          </form>
          {testResult?.ok ? (
            <p className="text-[12px] text-muted-foreground" role="status" data-testid="onboarding-test-ok">
              {t("secrets.testOk", { ms: testResult.latencyMs })}
            </p>
          ) : null}
          <Button
            type="button"
            data-testid="onboarding-finish"
            disabled={!savedKey || testResult?.ok !== true}
            onClick={() => {
              if (savedKey) {
                onComplete(savedKey);
              }
            }}
          >
            {t("onboarding.ask")}
          </Button>
        </section>
      )}
      {error ? (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
