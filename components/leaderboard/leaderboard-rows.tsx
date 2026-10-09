"use client";

import { Crown } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useFormat } from "@/lib/hooks/use-format";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { previewOf } from "@/lib/services/store-service";
import { cn } from "@/lib/utils/cn";
import type { LeaderboardCategory, LeaderboardEntry, StoreItem } from "@/types/game";

export function useValueFormatter(category: LeaderboardCategory) {
  const { t, format } = useI18n();
  const fmt = useFormat();
  return (value: number) =>
    category === "capital"
      ? fmt.usd(value)
      : category === "level"
        ? format(t.leaderboard.valueLevel, { n: value })
        : format(t.leaderboard.valueWins, { n: fmt.number(value) });
}

interface RowProps {
  entry: LeaderboardEntry;
  category: LeaderboardCategory;
  lookup: ReadonlyMap<string, StoreItem>;
}

export function LeaderboardRow({ entry, category, lookup }: RowProps) {
  const { t } = useI18n();
  const formatValue = useValueFormatter(category);
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5",
        entry.isCurrentPlayer ? "border border-brand-400/40 bg-brand-500/12" : "border border-transparent",
      )}
      aria-current={entry.isCurrentPlayer || undefined}
    >
      <span className="tabular w-8 shrink-0 text-center text-[13px] font-semibold text-mist-500">{entry.rank}</span>
      <Avatar name={entry.nickname} photoUrl={entry.photoUrl} size={36} frame={previewOf(lookup, entry.frame)} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {entry.nickname}
          {entry.isCurrentPlayer && <span className="ml-1.5 text-[11px] font-semibold text-brand-300">· {t.leaderboard.you}</span>}
        </span>
        <span className="block text-[11px] text-mist-500">
          {t.common.levelShort} {entry.level}
        </span>
      </span>
      <span className="tabular shrink-0 text-[13.5px] font-semibold">{formatValue(entry.value)}</span>
    </li>
  );
}

const PODIUM_ORDER = [1, 0, 2] as const;

export function Podium({ entries, category, lookup }: { entries: LeaderboardEntry[]; category: LeaderboardCategory; lookup: ReadonlyMap<string, StoreItem> }) {
  const formatValue = useValueFormatter(category);
  return (
    <ol className="grid grid-cols-3 items-end gap-2.5 animate-fade-up">
      {PODIUM_ORDER.map((index) => {
        const entry = entries[index];
        if (!entry) return <li key={index} />;
        const first = entry.rank === 1;
        return (
          <li key={entry.rank} className="flex min-w-0 flex-col items-center">
            <div className="relative">
              {first && <Crown className="absolute -top-6 left-1/2 size-5 -translate-x-1/2 fill-white/90 text-white" aria-hidden />}
              <Avatar name={entry.nickname} photoUrl={entry.photoUrl} size={first ? 68 : 54} frame={previewOf(lookup, entry.frame)} />
              <span
                className={cn(
                  "absolute -bottom-2 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full border text-[11px] font-bold",
                  first ? "border-white bg-white text-ink-950" : "border-brand-300/60 bg-ink-900 text-brand-100",
                )}
              >
                {entry.rank}
              </span>
            </div>
            <span className={cn("mt-4 max-w-full truncate text-[13px] font-semibold", entry.isCurrentPlayer && "text-brand-200")}>
              {entry.nickname}
            </span>
            <span className="tabular mt-0.5 max-w-full truncate text-[12px] text-mist-300">{formatValue(entry.value)}</span>
            <span
              className={cn(
                "mt-2.5 w-full rounded-t-2xl border border-b-0",
                first
                  ? "h-20 border-brand-300/40 bg-gradient-to-b from-brand-500/45 to-brand-500/5 shadow-[0_-12px_40px_-16px_rgb(36_107_253/0.9)]"
                  : entry.rank === 2
                    ? "h-14 border-white/15 bg-gradient-to-b from-white/[0.14] to-white/[0.02]"
                    : "h-10 border-white/10 bg-gradient-to-b from-brand-500/20 to-transparent",
              )}
              aria-hidden
            />
          </li>
        );
      })}
    </ol>
  );
}
