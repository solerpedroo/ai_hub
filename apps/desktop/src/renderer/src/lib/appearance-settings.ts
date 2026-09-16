import type { AppearanceSettings, AppLocale, ThemeMode } from "@ai-hub/shared";
import { localeSchema, themeModeSchema } from "@ai-hub/shared";

export const THEME_STORAGE_KEY = "ai-hub.theme";
export const LOCALE_STORAGE_KEY = "ai-hub.locale";

function isThemeMode(value: string): value is ThemeMode {
  return (themeModeSchema as readonly string[]).includes(value);
}

function isLocale(value: string): value is AppLocale {
  return (localeSchema as readonly string[]).includes(value);
}

export function readCachedTheme(): ThemeMode {
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (raw && isThemeMode(raw)) {
    return raw;
  }
  return "system";
}

export function readCachedLocale(): AppLocale {
  const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (raw && isLocale(raw)) {
    return raw;
  }
  return "pt-BR";
}

function writeCache(settings: AppearanceSettings): void {
  window.localStorage.setItem(THEME_STORAGE_KEY, settings.theme);
  window.localStorage.setItem(LOCALE_STORAGE_KEY, settings.locale);
}

export async function persistAppearanceSettings(settings: AppearanceSettings): Promise<void> {
  writeCache(settings);
  await window.hub.settings.setAppearance(settings);
}

export async function hydrateAppearanceSettings(): Promise<AppearanceSettings> {
  const fromDb = await window.hub.settings.getAppearance();
  const cachedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  const cachedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  const dbUntouched = fromDb.theme === "system" && fromDb.locale === "pt-BR";
  const cacheHasCustom =
    (cachedTheme !== null && cachedTheme !== "system") ||
    (cachedLocale !== null && cachedLocale !== "pt-BR");
  if (dbUntouched && cacheHasCustom) {
    const migrated: AppearanceSettings = {
      theme: cachedTheme && isThemeMode(cachedTheme) ? cachedTheme : fromDb.theme,
      locale: cachedLocale && isLocale(cachedLocale) ? cachedLocale : fromDb.locale,
    };
    await persistAppearanceSettings(migrated);
    return migrated;
  }
  writeCache(fromDb);
  return fromDb;
}
