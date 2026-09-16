export const themeModeSchema = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof themeModeSchema)[number];

export const localeSchema = ["pt-BR", "en"] as const;

export type AppLocale = (typeof localeSchema)[number];
