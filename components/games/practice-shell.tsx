"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, Coins, GraduationCap, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { botUrl } from "@/lib/config/env";
import type { GameModeId } from "@/lib/games/catalog";
import { practiceChips, usePracticeChips } from "@/lib/games/practice-chips";
import { useFormat } from "@/lib/hooks/use-format";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { openTelegramUrl } from "@/lib/telegram/webapp";

export function PracticeNotice() {
  const { t } = useI18n();
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
      <GraduationCap className="mt-0.5 size-4.5 shrink-0 text-brand-300" aria-hidden />
      <p className="text-[12.5px] leading-relaxed text-mist-300">
        <span className="font-semibold text-white">{t.games.practiceTitle}.</span> {t.games.practiceText}
      </p>
    </div>
  );
}

export function PracticeShell({ mode, children }: { mode: GameModeId; children: ReactNode }) {
  const { t } = useI18n();
  const fmt = useFormat();
  const chips = usePracticeChips();
  const url = botUrl();

  return (
    <div className="space-y-4">
      <PageHeader
        title={t.games.modes[mode].name}
        subtitle={t.games.practiceTitle}
        backHref="/games"
        actions={
          <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] py-1 pr-1 pl-3">
            <Coins className="size-4 text-brand-300" aria-hidden />
            <span className="tabular text-sm font-semibold" aria-label={`${t.games.chips}: ${chips}`} title={t.games.chipsHint}>
              {fmt.number(chips)}
            </span>
            <button
              type="button"
              onClick={() => practiceChips.reset()}
              aria-label={t.games.resetChips}
              title={t.games.resetChips}
              className="press grid size-7 place-items-center rounded-full text-mist-500 hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="size-3.5" aria-hidden />
            </button>
          </div>
        }
      />
      {children}
      <PracticeNotice />
      {url && (
        <Button variant="outline" block onClick={() => openTelegramUrl(url)} icon={<ArrowUpRight className="size-4" aria-hidden />}>
          {t.games.openInBot}
        </Button>
      )}
    </div>
  );
}
