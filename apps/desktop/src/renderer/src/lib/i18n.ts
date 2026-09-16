import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import type { AppLocale } from "@ai-hub/shared";
import en from "../locales/en.json";
import ptBR from "../locales/pt-BR.json";
import { persistAppearanceSettings, readCachedLocale, readCachedTheme } from "./appearance-settings";

export function persistLocale(locale: AppLocale): void {
  void persistAppearanceSettings({ theme: readCachedTheme(), locale });
  void i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "pt-BR": { translation: ptBR },
  },
  lng: readCachedLocale(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

document.documentElement.lang = readCachedLocale();

export default i18n;
