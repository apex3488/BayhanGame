"use client";

import { FlaskConical } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useGameApi } from "@/lib/state/game-api-context";
import { useTelegram } from "@/lib/telegram/telegram-provider";
import { cn } from "@/lib/utils/cn";

export function DemoChip({ className }: { className?: string }) {
  const { t } = useI18n();
  const { isDemo } = useGameApi();
  if (!isDemo) return null;
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md border border-brand-400/40 bg-brand-500/15 px-1.5 text-[10px] font-bold tracking-[0.12em] text-brand-200",
        className,
      )}
    >
      {t.common.demoTag}
    </span>
  );
}

/** Only when DATA_SOURCE=demo — never shown as a substitute for a broken live connection. */
export function DemoNotice() {
  const { t } = useI18n();
  const { isDemo } = useGameApi();
  const { status } = useTelegram();
  if (!isDemo) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-brand-400/20 bg-brand-500/[0.07] px-4 py-3 animate-fade-up">
      <FlaskConical className="mt-0.5 size-4.5 shrink-0 text-brand-300" aria-hidden />
      <p className="text-[12.5px] leading-relaxed text-mist-300">
        <span className="font-semibold text-white">{t.demo.title}.</span>{" "}
        {status === "telegram" ? t.demo.text : t.demo.browserText}
      </p>
    </div>
  );
}
