import { type FormEvent, type JSX, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AppLocale,
  AppPrefs,
  MonthlyCostsResult,
  MarketplacePackDto,
  ProviderDto,
  ProviderKeyDto,
  ProjectDto,
  ScopedSpendCapDto,
  SecretsTestResult,
  SpendCapDto,
  ThemeMode,
  UpdateCheckResult,
} from "@ai-hub/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { persistLocale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import type { SettingsSection } from "./types";

export function SettingsView({
  focusSection = "general",
}: {
  focusSection?: SettingsSection;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [providers, setProviders] = useState<ProviderDto[]>([]);
  const [keys, setKeys] = useState<ProviderKeyDto[]>([]);
  const [providerSlug, setProviderSlug] = useState("openrouter");
  const [label, setLabel] = useState("default");
  const [secret, setSecret] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://127.0.0.1:11434/v1");
  const [error, setError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, SecretsTestResult>>({});
  const [caps, setCaps] = useState<Record<SpendCapDto["scope"], string>>({
    request: "",
    day: "",
    global: "",
  });
  const [capsNotice, setCapsNotice] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<AppPrefs | null>(null);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [monthlyCosts, setMonthlyCosts] = useState<MonthlyCostsResult | null>(null);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [scopedCaps, setScopedCaps] = useState<ScopedSpendCapDto[]>([]);
  const [capDimension, setCapDimension] = useState<"project" | "provider">("project");
  const [capSubject, setCapSubject] = useState("");
  const [scopedCapLimit, setScopedCapLimit] = useState("");
  const [marketplacePacks, setMarketplacePacks] = useState<MarketplacePackDto[]>([]);
  const generalRef = useRef<HTMLHeadingElement>(null);
  const providerRef = useRef<HTMLSelectElement>(null);
  const capRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const target =
        focusSection === "providers"
          ? providerRef.current
          : focusSection === "caps"
            ? capRef.current
            : generalRef.current;
      target?.scrollIntoView({ block: "center" });
      target?.focus();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [focusSection]);

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
        const openrouter = list.find((item) => item.slug === "openrouter");
        if (openrouter) {
          setProviderSlug(openrouter.slug);
        } else if (list[0]) {
          setProviderSlug(list[0].slug);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(t("workspace.error.generic"));
        }
      });
    void window.hub.marketplace.list().then((list) => {
      if (!cancelled) setMarketplacePacks(list);
    }).catch(() => {
      if (!cancelled) setError(t("workspace.error.generic"));
    });
    void window.hub.projects.list().then((list) => {
      if (!cancelled) {
        setProjects(list);
        if (list[0]) setCapSubject((current) => current || list[0]?.id || "");
      }
    }).catch(() => undefined);
    void window.hub.scopedSpendCaps.get().then((list) => {
      if (!cancelled) setScopedCaps(list);
    }).catch(() => undefined);
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
    void window.hub.spendCaps
      .get()
      .then((list) => {
        if (cancelled) {
          return;
        }
        setCaps({
          request: list.find((item) => item.scope === "request")?.limitUsd ?? "",
          day: list.find((item) => item.scope === "day")?.limitUsd ?? "",
          global: list.find((item) => item.scope === "global")?.limitUsd ?? "",
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError(t("workspace.error.generic"));
        }
      });
    void window.hub.prefs
      .get()
      .then((next) => {
        if (!cancelled) {
          setPrefs(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(t("workspace.error.generic"));
        }
      });
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    void window.hub.costs.monthly({ month }).then((result) => {
      if (!cancelled) setMonthlyCosts(result);
    }).catch(() => {
      if (!cancelled) setError(t("workspace.error.generic"));
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
    const payload =
      providerSlug === "custom"
        ? { providerSlug, label, secret: value, baseUrl }
        : { providerSlug, label, secret: value };
    void window.hub.secrets
      .save(payload)
      .then(() => {
        setError(null);
        reloadKeys();
      })
      .catch(() => setError(t("secrets.error.save")));
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div>
        <h1 ref={generalRef} tabIndex={-1} className="text-base font-semibold">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-muted-foreground">{t("settings.hint")}</p>
      </div>
      <section className="flex flex-col gap-2">
        <h2 className="text-[12px] font-medium">{t("costTracker.title")}</h2>
        {monthlyCosts ? (
          <>
            <p className="text-muted-foreground" data-testid="cost-tracker-summary">
              {t("costTracker.summary", { month: monthlyCosts.month, requests: monthlyCosts.requests, tokens: monthlyCosts.tokens, usd: monthlyCosts.costUsd })}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <h3 className="text-[12px] font-medium">{t("costTracker.models")}</h3>
                <ul className="text-[11px] text-muted-foreground">
                  {monthlyCosts.byModel.map((row) => <li key={row.key}>{row.key} · {row.requests} · ${row.costUsd}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-[12px] font-medium">{t("costTracker.projects")}</h3>
                <ul className="text-[11px] text-muted-foreground">
                  {monthlyCosts.byProject.map((row) => <li key={row.key}>{row.key} · {row.requests} · ${row.costUsd}</li>)}
                </ul>
              </div>
            </div>
          </>
        ) : <p className="text-muted-foreground">{t("costTracker.loading")}</p>}
      </section>
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
        <h2 className="text-[12px] font-medium">{t("marketplace.title")}</h2>
        <p className="text-muted-foreground">{t("marketplace.hint")}</p>
        <ul className="flex flex-col gap-2" data-testid="marketplace-packs">
          {marketplacePacks.map((pack) => (
            <li key={pack.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div>
                <p className="text-[13px] font-medium">{t(pack.titleKey)}</p>
                <p className="text-[11px] text-muted-foreground">{t(pack.descriptionKey)}</p>
                <p className="text-[11px] text-muted-foreground">{t("marketplace.permission", { count: pack.permissions.length })}</p>
              </div>
              <Button type="button" size="sm" variant={pack.installed ? "outline" : "default"} disabled={!pack.installable} data-testid={`marketplace-pack-${pack.id}`} onClick={() => {
                const action = pack.installed ? window.hub.marketplace.uninstall({ packId: pack.id }) : window.hub.marketplace.install({ packId: pack.id });
                void action.then(() => window.hub.marketplace.list()).then(setMarketplacePacks).catch(() => setError(t("workspace.error.generic")));
              }}>
                {pack.installable ? (pack.installed ? t("marketplace.uninstall") : t("marketplace.install")) : t("marketplace.coreIntegrated")}
              </Button>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-[12px] font-medium">{t("secrets.title")}</h2>
        <p className="text-muted-foreground">{t("secrets.hint")}</p>
        <form className="flex flex-col gap-2" onSubmit={onSaveKey}>
          <label className="flex flex-col gap-1 text-[12px]">
            {t("secrets.provider")}
            <select
              ref={providerRef}
              className="h-8 rounded-md border border-input bg-background px-2 text-[13px]"
              value={providerSlug}
              onChange={(event) => setProviderSlug(event.target.value)}
              data-testid="secrets-provider"
              aria-label={t("secrets.provider")}
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
          {providerSlug === "custom" ? (
            <label className="flex flex-col gap-1 text-[12px]">
              {t("secrets.baseUrl")}
              <Input
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                autoComplete="off"
                data-testid="secrets-base-url"
              />
              <span className="text-[11px] text-muted-foreground">{t("secrets.customEndpointHint")}</span>
            </label>
          ) : null}
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
          {keys.map((key) => {
            const result = testResults[key.id];
            return (
              <li
                key={key.id}
                className="flex flex-col gap-1 rounded-md border px-2 py-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span>
                    {key.providerSlug} · {key.label} · {key.maskedKey}
                    {key.endpointUrl ? ` · ${key.endpointUrl}` : ""}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid="secrets-test"
                      disabled={testingId === key.id}
                      onClick={() => {
                        setTestingId(key.id);
                        void window.hub.secrets
                          .test({ id: key.id })
                          .then((next) => {
                            setTestResults((current) => ({ ...current, [key.id]: next }));
                            setError(null);
                          })
                          .catch(() => setError(t("workspace.error.generic")))
                          .finally(() => setTestingId(null));
                      }}
                    >
                      {testingId === key.id ? t("secrets.testing") : t("secrets.test")}
                    </Button>
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
                  </div>
                </div>
                {result ? (
                  <p className="text-[11px] text-muted-foreground" role="status">
                    {result.ok
                      ? t("secrets.testOk", { ms: result.latencyMs })
                      : t("secrets.testFail", {
                          code: result.errorCode ?? "unknown",
                          ms: result.latencyMs,
                        })}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
        {error ? (
          <p className="text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-[12px] font-medium">{t("caps.title")}</h2>
        <p className="text-muted-foreground">{t("caps.hint")}</p>
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const nextCaps = (["request", "day", "global"] as const).map((scope) => {
              const raw = caps[scope].trim();
              return { scope, limitUsd: raw.length === 0 ? null : raw };
            });
            if (
              nextCaps.some(
                (item) =>
                  item.limitUsd !== null && !/^\d+(\.\d{1,6})?$/.test(item.limitUsd),
              )
            ) {
              setError(t("workspace.error.generic"));
              return;
            }
            void window.hub.spendCaps
              .set({
                caps: nextCaps,
              })
              .then((list) => {
                setCaps({
                  request: list.find((item) => item.scope === "request")?.limitUsd ?? "",
                  day: list.find((item) => item.scope === "day")?.limitUsd ?? "",
                  global: list.find((item) => item.scope === "global")?.limitUsd ?? "",
                });
                setCapsNotice(t("caps.saved"));
                setError(null);
              })
              .catch(() => setError(t("workspace.error.generic")));
          }}
        >
          {(["request", "day", "global"] as const).map((scope) => (
            <label key={scope} className="flex flex-col gap-1 text-[12px]">
              {t(`caps.scope.${scope}`)}
              <Input
                ref={scope === "request" ? capRef : undefined}
                value={caps[scope]}
                placeholder={t("caps.unlimited")}
                onChange={(event) =>
                  setCaps((current) => ({ ...current, [scope]: event.target.value }))
                }
                data-testid={`spend-cap-${scope}`}
                inputMode="decimal"
              />
            </label>
          ))}
          <Button type="submit" data-testid="spend-cap-save">
            {t("caps.save")}
          </Button>
        </form>
        {capsNotice ? (
          <p className="text-[11px] text-muted-foreground" role="status">
            {capsNotice}
          </p>
        ) : null}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-[12px] font-medium">{t("caps.scoped.title")}</h2>
        <p className="text-[11px] text-muted-foreground">{t("caps.scoped.hint")}</p>
        <div className="flex flex-wrap gap-2">
          <select value={capDimension} onChange={(event) => { const dimension = event.target.value as "project" | "provider"; setCapDimension(dimension); const next = dimension === "project" ? projects[0]?.id ?? "" : keys[0]?.providerSlug ?? ""; setCapSubject(next); setScopedCapLimit(""); }}>
            <option value="project">{t("caps.scoped.project")}</option>
            <option value="provider">{t("caps.scoped.provider")}</option>
          </select>
          <select value={capSubject} onChange={(event) => { const subjectId = event.target.value; setCapSubject(subjectId); setScopedCapLimit(scopedCaps.find((item) => item.dimension === capDimension && item.subjectId === subjectId)?.limitUsd ?? ""); }}>
            {(capDimension === "project" ? projects.map((item) => ({ id: item.id, label: item.name })) : [...new Map(keys.map((item) => [item.providerSlug, { id: item.providerSlug, label: item.providerSlug }])).values()]).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <Input value={scopedCapLimit} placeholder={t("caps.unlimited")} inputMode="decimal" onChange={(event) => setScopedCapLimit(event.target.value)} />
          <Button type="button" onClick={() => { if (!capSubject || (scopedCapLimit && !/^\d+(\.\d{1,6})?$/.test(scopedCapLimit))) { setError(t("workspace.error.generic")); return; } const cap = { dimension: capDimension, subjectId: capSubject, limitUsd: scopedCapLimit || null }; void window.hub.scopedSpendCaps.set({ caps: [cap] }).then(setScopedCaps).then(() => setCapsNotice(t("caps.saved"))).catch(() => setError(t("workspace.error.generic"))); }}>{t("caps.save")}</Button>
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-[12px] font-medium">{t("privacy.center.title")}</h2>
        <p className="text-muted-foreground">{t("privacy.center.hint")}</p>
        <label className="flex flex-col gap-1 text-[12px]">
          {t("privacy.center.mode")}
          <select
            value={prefs?.privacyMode ?? "normal"}
            onChange={(event) => {
              const privacyMode = event.target.value as AppPrefs["privacyMode"];
              void window.hub.prefs.set({ privacyMode }).then(setPrefs).catch(() => setError(t("workspace.error.generic")));
            }}
          >
            {(["private", "normal", "maximum"] as const).map((mode) => <option key={mode} value={mode}>{t(`privacy.mode.${mode}`)}</option>)}
          </select>
        </label>
        <p className="text-[11px] text-muted-foreground">{t(`privacy.modeDetail.${prefs?.privacyMode ?? "normal"}`)}</p>
        <h3 className="text-[12px] font-medium">{t("privacy.firewall")}</h3>
        {(["secret", "token", "email", "cpf", "prompt_injection"] as const).map((kind) => (
          <label key={kind} className="flex items-center justify-between gap-2 text-[12px]">
            {t(`privacy.kind.${kind}`)}
            <select
              value={prefs?.firewallPolicy[kind] ?? "mask"}
              onChange={(event) => {
                if (!prefs) return;
                const firewallPolicy = { ...prefs.firewallPolicy, [kind]: event.target.value as "block" | "mask" | "allow" };
                void window.hub.prefs.set({ firewallPolicy }).then(setPrefs).catch(() => setError(t("workspace.error.generic")));
              }}
            >
              {(kind === "secret" || kind === "token" ? ["block", "mask"] : ["block", "mask", "allow"] as const).map((action) => <option key={action} value={action}>{t(`privacy.action.${action}`)}</option>)}
            </select>
          </label>
        ))}
        <h3 className="mt-2 text-[12px] font-medium">{t("privacy.crash.title")}</h3>
        <p className="text-muted-foreground">{t("privacy.hint")}</p>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            data-testid="crash-reporter-opt-in"
            checked={prefs?.crashReporterOptIn === true}
            onChange={(event) => {
              const optIn = event.target.checked;
              void window.hub.prefs
                .set({ crashReporterOptIn: optIn })
                .then(setPrefs)
                .catch(() => setError(t("workspace.error.generic")));
            }}
          />
          {t("privacy.crashOptIn")}
        </label>
        <p className="text-[11px] text-muted-foreground">{t("privacy.crashDetail")}</p>
        <h3 className="mt-2 text-[12px] font-medium">{t("voice.settings.title")}</h3>
        <p className="text-muted-foreground">{t("voice.settings.hint")}</p>
        <p className="text-[11px] text-amber-700 dark:text-amber-400">{t("voice.cloudWarning")}</p>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            data-testid="voice-cloud-ack-settings"
            checked={prefs?.voiceCloudAck === true}
            onChange={(event) => {
              void window.hub.prefs
                .set({ voiceCloudAck: event.target.checked })
                .then(setPrefs)
                .catch(() => setError(t("workspace.error.generic")));
            }}
          />
          {t("voice.cloudAck")}
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            data-testid="voice-continuous-settings"
            checked={prefs?.voiceContinuous === true}
            onChange={(event) => {
              void window.hub.prefs
                .set({ voiceContinuous: event.target.checked })
                .then(setPrefs)
                .catch(() => setError(t("workspace.error.generic")));
            }}
          />
          {t("voice.continuous")}
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            data-testid="voice-audio-disk-opt-in"
            checked={prefs?.audioDiskOptIn === true}
            disabled={prefs?.privacyMode === "private"}
            onChange={(event) => {
              void window.hub.prefs
                .set({ audioDiskOptIn: event.target.checked })
                .then(setPrefs)
                .catch(() => setError(t("workspace.error.generic")));
            }}
          />
          {t("voice.audioDiskOptIn")}
        </label>
        <p className="text-[11px] text-muted-foreground">{t("voice.audioDiskDetail")}</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-[12px] font-medium">{t("updates.title")}</h2>
        <p className="text-muted-foreground">{t("updates.hint")}</p>
        <Button
          type="button"
          variant="outline"
          data-testid="updates-check"
          disabled={checkingUpdate}
          onClick={() => {
            setCheckingUpdate(true);
            void window.hub.updates
              .check()
              .then((result) => {
                setUpdateResult(result);
                return window.hub.prefs.get();
              })
              .then(setPrefs)
              .catch(() => setError(t("workspace.error.generic")))
              .finally(() => setCheckingUpdate(false));
          }}
        >
          {checkingUpdate ? t("updates.checking") : t("updates.check")}
        </Button>
        {updateResult ? (
          <p
            className="text-[11px] text-muted-foreground"
            role="status"
            data-testid="updates-status"
            data-status={updateResult.status}
          >
            {t(`updates.status.${updateResult.status}`, {
              version: updateResult.version ?? "—",
            })}
          </p>
        ) : prefs?.lastUpdateStatus && prefs.lastUpdateStatus !== "idle" ? (
          <p
            className="text-[11px] text-muted-foreground"
            role="status"
            data-testid="updates-status"
            data-status={prefs.lastUpdateStatus}
          >
            {t(`updates.status.${prefs.lastUpdateStatus}`, { version: "—" })}
          </p>
        ) : null}
      </section>
    </div>
  );
}
