"use client";

import { Check } from "lucide-react";
import { LOCALE_LABELS, LOCALES } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { haptic } from "@/lib/telegram/webapp";
import { cn } from "@/lib/utils/cn";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t.settings.language} className="grid grid-cols-3 gap-2">
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            lang={code}
            onClick={() => {
              haptic.selection();
              setLocale(code);
            }}
            className={cn(
              "press relative flex flex-col items-start rounded-2xl border px-3.5 py-3 text-left",
              active ? "border-brand-400/60 bg-brand-500/12 glow-soft" : "border-white/[0.08] bg-white/[0.03] hover:border-white/20",
            )}
          >
            <span className="text-[15px] font-bold tracking-wide">{LOCALE_LABELS[code].short}</span>
            <span className="mt-0.5 text-[12px] text-mist-300">{LOCALE_LABELS[code].native}</span>
            {active && <Check className="absolute top-3 right-3 size-4 text-brand-300" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
