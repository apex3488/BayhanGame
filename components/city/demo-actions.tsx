"use client";

import type { ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { botUrl } from "@/lib/config/env";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useGameApi } from "@/lib/state/game-api-context";
import { openTelegramUrl } from "@/lib/telegram/webapp";

/** Lifestyle mutations only run in DEMO. Live mode opens the Telegram bot. */
export function useDemoActionsAllowed(): boolean {
  return useGameApi().isDemo;
}

export function LiveBotNotice({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  const { isDemo } = useGameApi();
  const url = botUrl();
  if (isDemo) return children ? <>{children}</> : null;
  return (
    <div className="surface space-y-3 p-4">
      <p className="text-[13px] leading-relaxed text-mist-300">{t.city.liveBotOnly}</p>
      <Button
        block
        size="sm"
        disabled={!url}
        onClick={() => url && openTelegramUrl(url)}
      >
        {t.games.openInBot}
      </Button>
      {!url && <p className="text-[12px] text-mist-500">{t.settings.botNotConfigured}</p>}
      {children}
    </div>
  );
}

export function OpenInBotButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const url = botUrl();
  if (!url) {
    return (
      <Button disabled block size="sm" className={className}>
        {t.games.openInBot}
      </Button>
    );
  }
  return (
    <Button block size="sm" className={className} onClick={() => openTelegramUrl(url)}>
      {t.games.openInBot}
    </Button>
  );
}

export function CityBackLink() {
  const { t } = useI18n();
  return (
    <ButtonLink href="/city" variant="ghost" size="sm">
      {t.city.toHub}
    </ButtonLink>
  );
}
