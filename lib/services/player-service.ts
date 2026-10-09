"use client";

import type { GameApi } from "@/lib/api/game-api";
import type { ApiResult } from "@/lib/api/result";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useGameApi } from "@/lib/state/game-api-context";
import { invalidateResources, loadResource, updateResources, useResource } from "@/lib/state/resource-store";
import type { DailyRewardResult, Locale, Player, PlayerStats } from "@/types/game";

const PLAYER_PREFIX = "player:";
const ACTIVITY_PREFIX = "activity:";

export function usePlayer() {
  const { api } = useGameApi();
  const { locale } = useI18n();
  return useResource(`${PLAYER_PREFIX}${locale}`, () => api.getPlayer(locale));
}

export function useActivity(limit = 20) {
  const { api } = useGameApi();
  const { locale } = useI18n();
  return useResource(`${ACTIVITY_PREFIX}${locale}:${limit}`, () => api.getActivity(locale, limit));
}

/** Patch every cached copy of the player with values confirmed by the backend. */
export function patchPlayer(patch: (player: Player) => Player): void {
  updateResources<Player>(PLAYER_PREFIX, patch);
}

export function refreshPlayer(api: GameApi, locale: Locale): Promise<void> {
  return loadResource(`${PLAYER_PREFIX}${locale}`, () => api.getPlayer(locale), true);
}

export function invalidateActivity(): void {
  invalidateResources(ACTIVITY_PREFIX);
}

export async function claimDailyReward(api: GameApi): Promise<ApiResult<DailyRewardResult>> {
  const result = await api.claimDailyReward();
  if (result.ok) {
    const { balanceUsd, streak, nextDailyAt, rewardUsd } = result.data;
    patchPlayer((player) => ({
      ...player,
      usdBalance: balanceUsd,
      dailyStreak: streak,
      nextDailyAt,
      dailyChangeUsd: player.dailyChangeUsd === null ? null : player.dailyChangeUsd + rewardUsd,
    }));
    invalidateActivity();
  }
  return result;
}

export function isDailyAvailable(player: Player, now: number): boolean {
  return !player.nextDailyAt || new Date(player.nextDailyAt).getTime() <= now;
}

export function levelProgress(player: Player): { ratio: number; remaining: number | null } {
  if (!player.xpForNextLevel || player.xpForNextLevel <= 0) return { ratio: 0, remaining: null };
  const ratio = Math.min(1, Math.max(0, player.xp / player.xpForNextLevel));
  return { ratio, remaining: Math.max(0, player.xpForNextLevel - player.xp) };
}

export function winRate(stats: PlayerStats): number | null {
  return stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : null;
}
