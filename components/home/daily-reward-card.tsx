"use client";

import { useState } from "react";
import { Check, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useFormat } from "@/lib/hooks/use-format";
import { useNow } from "@/lib/hooks/use-now";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { claimDailyReward, isDailyAvailable, usePlayer } from "@/lib/services/player-service";
import { useGameApi } from "@/lib/state/game-api-context";
import { cn } from "@/lib/utils/cn";

const WEEK = 7;

export function DailyRewardCard() {
  const { t, format } = useI18n();
  const fmt = useFormat();
  const toast = useToast();
  const { api, isDemo } = useGameApi();
  const player = usePlayer();
  const now = useNow();
  const [claiming, setClaiming] = useState(false);
  const data = player.data;

  if (!data) return <Skeleton className="h-[132px] w-full rounded-[var(--radius-card)]" />;

  const available = isDailyAvailable(data, now);
  const filled = data.dailyStreak % WEEK || (data.dailyStreak > 0 && !available ? WEEK : 0);

  async function claim() {
    setClaiming(true);
    const result = await claimDailyReward(api);
    setClaiming(false);
    if (result.ok) {
      toast({
        tone: "success",
        title: `${t.home.dailyTitle}: ${fmt.signedUsd(result.data.rewardUsd)}`,
        description: isDemo ? t.demo.claimDone : undefined,
      });
    } else {
      toast({ tone: "error", title: t.errors[result.error.code] });
    }
  }

  return (
    <section className="surface relative overflow-hidden p-4 animate-fade-up" aria-labelledby="daily-title">
      <div className="pointer-events-none absolute -top-16 -right-10 size-44 rounded-full bg-brand-500/15 blur-3xl" aria-hidden />
      <div className="relative flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-brand-400/30 bg-brand-500/15">
          <Gift className="size-5 text-brand-200" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="daily-title" className="text-[15px] font-semibold">
            {t.home.dailyTitle}
          </h2>
          <p className="text-[12px] text-mist-300">
            {available
              ? format(t.home.dailyStreak, { n: data.dailyStreak })
              : format(t.home.dailyNextIn, { time: fmt.duration(Date.parse(data.nextDailyAt ?? "") - now) })}
          </p>
        </div>
        <Button size="sm" onClick={claim} loading={claiming} disabled={!available}>
          {available ? t.home.dailyClaim : <Check className="size-4" aria-label={t.tasks.claimed} />}
        </Button>
      </div>
      <ol className="relative mt-4 grid grid-cols-7 gap-1.5" aria-label={format(t.home.dailyStreak, { n: data.dailyStreak })}>
        {Array.from({ length: WEEK }, (_, index) => {
          const done = index < filled;
          const next = index === filled && available;
          return (
            <li
              key={index}
              aria-label={format(t.home.dailyDay, { n: index + 1 })}
              className={cn(
                "flex h-9 flex-col items-center justify-center rounded-xl border text-[11px] font-semibold transition-colors",
                done && "border-brand-400/50 bg-brand-500/25 text-white",
                next && "border-brand-300/70 bg-brand-500/10 text-brand-100 shadow-[0_0_14px_-4px_rgb(59_130_246/0.9)]",
                !done && !next && "border-white/[0.06] bg-white/[0.02] text-mist-500",
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : index + 1}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
