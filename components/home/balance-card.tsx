"use client";

import { Bitcoin, ChevronRight, CircleDollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { DemoChip } from "@/components/layout/demo-notice";
import { ButtonLink } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { useFormat } from "@/lib/hooks/use-format";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { usePlayer } from "@/lib/services/player-service";

export function BalanceCard() {
  const { t } = useI18n();
  const fmt = useFormat();
  const player = usePlayer();
  const data = player.data;

  if (!data && player.status === "error") return <ErrorState error={player.error} onRetry={player.reload} />;

  const amount = data ? fmt.usd(data.usdBalance) : "";
  const change = data?.dailyChangeUsd ?? null;

  return (
    <section className="balance-card px-5 pt-5 pb-5 animate-fade-up" aria-label={t.home.balance}>
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-mist-300">{t.home.balance}</span>
          <DemoChip />
        </div>
        <ButtonLink href="/profile" variant="secondary" size="sm" className="-mr-1 h-8 rounded-full bg-white/[0.07] pr-2 pl-3">
          {t.home.openProfile}
          <ChevronRight className="size-4" aria-hidden />
        </ButtonLink>
      </div>

      <div className="relative mt-3 min-h-[52px]">
        {data ? (
          <p className="tabular text-gradient text-[44px] leading-[1.05] font-bold tracking-[-0.045em] max-[359px]:text-[36px]">
            {amount}
          </p>
        ) : (
          <Skeleton className="h-12 w-56" />
        )}
      </div>

      <div className="relative mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-[13px] text-mist-300">
          <CircleDollarSign className="size-4 text-brand-300" aria-hidden />
          <span className="font-semibold text-white">{t.common.currencyName}</span>
          <span className="text-mist-500">· {t.common.currencyHint}</span>
        </span>
        {change !== null && change !== 0 && (
          <span className="inline-flex h-6 items-center gap-1 rounded-full border border-brand-400/25 bg-brand-500/15 px-2 text-[12px] font-semibold text-brand-100">
            {change > 0 ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
            <span className="tabular">{fmt.signedUsd(change)}</span>
            <span className="font-normal text-brand-200/80">{t.home.today}</span>
          </span>
        )}
      </div>

      {data && data.btcBalance > 0 && (
        <div className="relative mt-4 flex items-center gap-2 border-t border-white/[0.07] pt-3.5 text-[13px]">
          <span className="grid size-6 place-items-center rounded-full bg-white/[0.08]">
            <Bitcoin className="size-3.5 text-white" aria-hidden />
          </span>
          <span className="tabular font-semibold">{fmt.btc(data.btcBalance)}</span>
          <span className="text-mist-500">{t.common.btc}</span>
        </div>
      )}
    </section>
  );
}
