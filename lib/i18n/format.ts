import type { Locale } from "@/types/game";

const INTL_LOCALE: Record<Locale, string> = {
  ru: "ru-RU",
  uz: "uz-Latn-UZ",
  en: "en-US",
};

const cache = new Map<string, Intl.NumberFormat>();

function numberFormat(locale: Locale, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let formatter = cache.get(key);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(INTL_LOCALE[locale], options);
    } catch {
      formatter = new Intl.NumberFormat("en-US", options);
    }
    cache.set(key, formatter);
  }
  return formatter;
}

export function formatNumber(value: number, locale: Locale, compact = false): string {
  if (compact && Math.abs(value) >= 10_000) {
    return numberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  return numberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

/** USD amounts as "$12 345". Cents are dropped above $1 000 to keep large balances readable. */
export function formatUsd(value: number, locale: Locale, compact = false): string {
  const sign = value < 0 ? "−" : "";
  const abs = Math.abs(value);
  if (compact && abs >= 10_000) return `${sign}$${formatNumber(abs, locale, true)}`;
  const digits = abs < 1000 && abs % 1 !== 0 ? 2 : 0;
  const body = numberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(abs);
  return `${sign}$${body}`;
}

export function formatSignedUsd(value: number, locale: Locale, compact = false): string {
  return value > 0 ? `+${formatUsd(value, locale, compact)}` : formatUsd(value, locale, compact);
}

export function formatBtc(value: number, locale: Locale): string {
  return numberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 8 }).format(value);
}

export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "long", year: "numeric" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatRelative(iso: string, locale: Locale, now = Date.now()): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "—";
  const seconds = Math.round((time - now) / 1000);
  const abs = Math.abs(seconds);
  let rtf: Intl.RelativeTimeFormat;
  try {
    rtf = new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: "auto", style: "short" });
  } catch {
    rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto", style: "short" });
  }
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86_400), "day");
}
