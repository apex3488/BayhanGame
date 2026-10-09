"use client";

import { Award, Bitcoin, Coins, Gamepad2, Landmark, Medal, Percent, Trophy, Wallet, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useFormat } from "@/lib/hooks/use-format";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { levelProgress, winRate } from "@/lib/services/player-service";
import type { Player } from "@/types/game";

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="surface flex flex-col gap-2 p-3.5">
      <Icon className="size-4 text-brand-300" aria-hidden />
      <span className="tabular truncate text-[17px] leading-none font-bold tracking-[-0.02em]">{value}</span>
      <span className="truncate text-[11.5px] text-mist-500">{label}</span>
    </div>
  );
}

export function XpCard({ player }: { player: Player }) {
  const { t, format } = useI18n();
  const fmt = useFormat();
  const progress = levelProgress(player);
  return (
    <Card className="p-4 animate-fade-up">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">
          {t.common.level} {player.level}
        </span>
        <span className="tabular text-[12px] text-mist-300">
          {player.xpForNextLevel !== null
            ? format(t.profile.xpProgress, { xp: fmt.number(player.xp), next: fmt.number(player.xpForNextLevel) })
            : `${fmt.number(player.xp)} XP`}
        </span>
      </div>
      <ProgressBar className="mt-3" value={player.xp} max={player.xpForNextLevel ?? player.xp} label={t.home.progressTitle} />
      {progress.remaining !== null && (
        <p className="mt-2 text-[12px] text-mist-500">{format(t.home.toNextLevel, { xp: fmt.number(progress.remaining), level: player.level + 1 })}</p>
      )}
    </Card>
  );
}

export function BalanceStats({ player }: { player: Player }) {
  const { t } = useI18n();
  const fmt = useFormat();
  return (
    <div className="grid grid-cols-3 gap-2.5 animate-fade-up">
      <Stat icon={Wallet} label={t.profile.balance} value={fmt.usd(player.usdBalance)} />
      <Stat icon={Landmark} label={t.profile.bank} value={player.bankUsd === null ? "—" : fmt.usd(player.bankUsd)} />
      <Stat icon={Bitcoin} label={t.profile.btc} value={fmt.btc(player.btcBalance)} />
    </div>
  );
}

export function GameStats({ player, rank }: { player: Player; rank: number | null }) {
  const { t } = useI18n();
  const fmt = useFormat();
  const rate = winRate(player.stats);
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 animate-fade-up">
      <Stat icon={Gamepad2} label={t.profile.gamesPlayed} value={fmt.number(player.stats.gamesPlayed)} />
      <Stat icon={Trophy} label={t.profile.wins} value={fmt.number(player.stats.gamesWon)} />
      <Stat icon={Percent} label={t.profile.winRate} value={rate === null ? "—" : `${rate}%`} />
      <Stat icon={Award} label={t.profile.achievements} value={`${player.stats.achievementsUnlocked}/${player.stats.achievementsTotal}`} />
      <Stat icon={Medal} label={t.profile.rank} value={rank === null ? "—" : `#${rank}`} />
      <Stat icon={Coins} label={t.profile.wagered} value={fmt.usd(player.stats.totalWagered)} />
    </div>
  );
}
