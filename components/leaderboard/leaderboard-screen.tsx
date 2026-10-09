"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { DemoChip } from "@/components/layout/demo-notice";
import { PageHeader } from "@/components/layout/page-header";
import { Segmented } from "@/components/ui/controls";
import { EmptyState, ErrorState, Skeleton, SkeletonList } from "@/components/ui/feedback";
import { useFormat } from "@/lib/hooks/use-format";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { LEADERBOARD_CATEGORIES, useLeaderboard, type LeaderboardScope } from "@/lib/services/leaderboard-service";
import { useItemLookup } from "@/lib/services/store-service";
import type { LeaderboardCategory } from "@/types/game";
import { LeaderboardRow, Podium } from "./leaderboard-rows";

export function LeaderboardScreen() {
  const { t, format } = useI18n();
  const fmt = useFormat();
  const [category, setCategory] = useState<LeaderboardCategory>("capital");
  const [scope, setScope] = useState<LeaderboardScope>(10);
  const board = useLeaderboard(category, scope);
  const lookup = useItemLookup();

  const entries = board.data?.entries ?? [];
  const me = board.data?.me ?? null;

  return (
    <div className="space-y-5">
      <PageHeader title={t.leaderboard.title} subtitle={t.leaderboard.subtitle} actions={<DemoChip />} />

      <div className="space-y-2.5">
        <Segmented
          label={t.leaderboard.title}
          value={category}
          onChange={setCategory}
          options={LEADERBOARD_CATEGORIES.map((value) => ({ value, label: t.leaderboard.categories[value] }))}
        />
        <Segmented
          size="sm"
          label="TOP"
          value={scope}
          onChange={setScope}
          className="mx-auto max-w-56"
          options={[
            { value: 10, label: t.leaderboard.top10 },
            { value: 100, label: t.leaderboard.top100 },
          ]}
        />
      </div>

      {!board.data ? (
        board.status === "error" ? (
          <ErrorState error={board.error} onRetry={board.reload} />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 items-end gap-2.5 pt-6">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-36 rounded-2xl" />
            </div>
            <SkeletonList rows={5} />
          </div>
        )
      ) : entries.length === 0 ? (
        <EmptyState icon={Trophy} title={t.leaderboard.empty} />
      ) : (
        <>
          <div className="pt-6">
            <Podium entries={entries.slice(0, 3)} category={category} lookup={lookup} />
          </div>
          <ol className="surface space-y-0.5 p-1.5" aria-label={t.leaderboard.title}>
            {entries.slice(3).map((entry) => (
              <LeaderboardRow key={entry.rank} entry={entry} category={category} lookup={lookup} />
            ))}
          </ol>
          {board.data.updatedAt && (
            <p className="text-center text-[11.5px] text-mist-500">
              {format(t.leaderboard.updated, { time: fmt.relative(board.data.updatedAt) })}
            </p>
          )}
        </>
      )}

      {board.data && (
        <div className="sticky bottom-[calc(var(--nav-height)+var(--safe-bottom)+0.75rem)] z-30 md:bottom-6">
          <div className="glass rounded-2xl border border-brand-400/30 p-1 shadow-[0_18px_40px_-18px_rgb(36_107_253/0.8)]">
            <p className="px-3 pt-1.5 text-[11px] font-semibold tracking-wide text-brand-200 uppercase">{t.leaderboard.yourPosition}</p>
            {me ? (
              <ul>
                <LeaderboardRow entry={{ ...me, isCurrentPlayer: false }} category={category} lookup={lookup} />
              </ul>
            ) : (
              <p className="px-3 pt-1 pb-2.5 text-sm text-mist-300">{t.leaderboard.notRanked}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
