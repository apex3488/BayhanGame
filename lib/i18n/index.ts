import type { Locale } from "@/types/game";
import en from "./dictionaries/en";
import ru, { type Dictionary } from "./dictionaries/ru";
import uz from "./dictionaries/uz";

export type { Dictionary };

export const LOCALES: readonly Locale[] = ["ru", "uz", "en"];
export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALE_STORAGE_KEY = "bayhan.locale";

export const LOCALE_LABELS: Record<Locale, { short: string; native: string }> = {
  ru: { short: "RU", native: "Русский" },
  uz: { short: "UZ", native: "O'zbekcha" },
  en: { short: "EN", native: "English" },
};

const DICTIONARIES: Record<Locale, Dictionary> = { ru, uz, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Map a Telegram/BCP-47 language code ("uz", "ru-RU", "en-GB") to a supported locale. */
export function matchLocale(code: string | null | undefined): Locale | null {
  if (!code) return null;
  const base = code.toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : null;
}

/** Replace {name} placeholders. Missing values are left visible to surface bugs. */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}
