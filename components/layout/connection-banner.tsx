"use client";

import { CloudOff, ShieldAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useGameApi } from "@/lib/state/game-api-context";
import { botUrl } from "@/lib/config/env";
import { openTelegramUrl } from "@/lib/telegram/webapp";
import { Button } from "@/components/ui/button";

/** Shown when a live data source was requested but the session cannot use it. */
export function ConnectionBanner() {
  const { t } = useI18n();
  const { isUnavailable, source } = useGameApi();
  const url = botUrl();

  if (!isUnavailable || !source.blockReason) return null;

  const Icon = source.blockReason === "outside_telegram" ? ShieldAlert : CloudOff;
  const title =
    source.blockReason === "outside_telegram" ? t.connection.needTelegramTitle : t.connection.notConfiguredTitle;
  const text =
    source.blockReason === "outside_telegram" ? t.connection.needTelegramText : t.connection.notConfiguredText;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 animate-fade-up">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-brand-300" aria-hidden />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-white">{title}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-mist-300">{text}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {source.blockReason === "outside_telegram" && (
          <Button size="sm" disabled={!url} onClick={() => url && openTelegramUrl(url)}>
            {t.games.openInBot}
          </Button>
        )}
        <ButtonLink href="/settings" variant="secondary" size="sm">
          {t.connection.openDiagnostics}
        </ButtonLink>
      </div>
    </div>
  );
}
