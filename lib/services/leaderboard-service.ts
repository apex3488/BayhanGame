"use client";

import { useGameApi } from "@/lib/state/game-api-context";
import { useResource } from "@/lib/state/resource-store";
import type { LeaderboardCategory } from "@/types/game";

export const LEADERBOARD_CATEGORIES: readonly LeaderboardCategory[] = ["capital", "level", "wins"];
export type LeaderboardScope = 10 | 100;

export function useLeaderboard(category: LeaderboardCategory, scope: LeaderboardScope) {
  const { api } = useGameApi();
  return useResource(`leaderboard:${category}:${scope}`, () => api.getLeaderboard(category, scope));
}
