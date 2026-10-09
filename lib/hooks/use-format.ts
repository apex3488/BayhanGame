"use client";

import { useMemo } from "react";
import { formatBtc, formatDate, formatNumber, formatRelative, formatSignedUsd, formatUsd } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { usePreferences } from "@/lib/preferences/preferences-provider";

/** Locale- and preference-aware formatters for UI components. */
export function useFormat() {
  const { locale, t, format } = useI18n();
  const { compactNumbers } = usePreferences().preferences;

  return useMemo(
    () => ({
      usd: (value: number) => formatUsd(value, locale, compactNumbers),
      usdFull: (value: number) => formatUsd(value, locale, false),
      signedUsd: (value: number) => formatSignedUsd(value, locale, compactNumbers),
      number: (value: number) => formatNumber(value, locale, compactNumbers),
      btc: (value: number) => formatBtc(value, locale),
      date: (iso: string) => formatDate(iso, locale),
      relative: (iso: string, now?: number) => formatRelative(iso, locale, now),
      duration: (ms: number) => {
        const minutes = Math.ceil(Math.max(0, ms) / 60_000);
        if (minutes < 1) return t.time.lessThanMinute;
        if (minutes < 60) return format(t.time.minutes, { m: minutes });
        return format(t.time.hoursMinutes, { h: Math.floor(minutes / 60), m: minutes % 60 });
      },
    }),
    [locale, compactNumbers, t, format],
  );
}
