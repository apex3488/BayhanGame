"use client";

import Link from "next/link";
import { ChevronRight, Trophy, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/feedback";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useLeaderboard } from "@/lib/services/leaderboard-service";
import { levelProgress, usePlayer, winRate } from "@/lib/services/player-service";

export function ProgressCard() {
  const { t, format } = useI18n();
  const player = usePlayer();
  const data = player.data;
  if (!data) return <Skeleton className="h-[148px] rounded-[var(--radius-card)]" />;

  const progress = levelProgress(data);
  const rate = winRate(data.stats);

  return (
    <Link href="/profile" className="press surface flex flex-col p-4 hover:border-brand-400/30">
      <span className="flex items-center gap-2 text-[12px] font-medium text-mist-300">
        <Zap className="size-3.5 text-brand-300" aria-hidden />
        {t.home.progressTitle}
      </span>
      <span className="mt-2 text-[22px] leading-none font-bold tracking-[-0.03em]">
        {t.common.level} {data.level}
      </span>
      <ProgressBar
        className="mt-3"
        size="sm"
        value={data.xp}
        max={data.xpForNextLevel ?? 1}
        label={t.home.progressTitle}
      />
      <span className="mt-2 text-[11.5px] text-mist-500">
        {progress.remaining !== null
          ? format(t.home.toNextLevel, { xp: progress.remaining, level: data.level + 1 })
          : t.common.noData}
      </span>
      <span className="mt-auto flex items-center justify-between pt-3 text-[12px]">
        <span className="text-mist-300">{t.home.winRate}</span>
        <span className="tabular font-semibold">{rate === null ? "—" : `${rate}%`}</span>
      </span>
    </Link>
  );
}

export function RankCard() {
  const { t } = useI18n();
  const board = useLeaderboard("capital", 10);
  const me = board.data?.me ?? null;

  return (
    <Link href="/leaderboard" className="press surface relative flex flex-col overflow-hidden p-4 hover:border-brand-400/30">
      <div className="pointer-events-none absolute -right-8 -bottom-10 size-32 rounded-full bg-brand-500/20 blur-2xl" aria-hidden />
      <span className="relative flex items-center gap-2 text-[12px] font-medium text-mist-300">
        <Trophy className="size-3.5 text-brand-300" aria-hidden />
        {t.home.rankTitle}
      </span>
      {board.data ? (
        <span className="tabular relative mt-2 text-[34px] leading-none font-bold tracking-[-0.04em]">
          {me ? `#${me.rank}` : <span className="text-lg text-mist-300">{t.home.unranked}</span>}
        </span>
      ) : (
        <Skeleton className="relative mt-2 h-9 w-20" />
      )}
      <span className="relative mt-1.5 text-[11.5px] text-mist-500">{t.leaderboard.categories.capital}</span>
      <span className="relative mt-auto flex items-center gap-0.5 pt-3 text-[12px] font-medium text-brand-300">
        {t.nav.leaderboard}
        <ChevronRight className="size-3.5" aria-hidden />
      </span>
    </Link>
  );
}
