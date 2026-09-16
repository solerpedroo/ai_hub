import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import type { AppLocale } from "@ai-hub/shared";
import { localeSchema } from "@ai-hub/shared";
import en from "../locales/en.json";
import ptBR from "../locales/pt-BR.json";

export const LOCALE_STORAGE_KEY = "ai-hub.locale";

export function readStoredLocale(): AppLocale {
  const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (raw && (localeSchema as readonly string[]).includes(raw)) {
    return raw as AppLocale;
  }
  return "pt-BR";
}

export function persistLocale(locale: AppLocale): void {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "pt-BR": { translation: ptBR },
  },
  lng: readStoredLocale(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

document.documentElement.lang = readStoredLocale();

export default i18n;
