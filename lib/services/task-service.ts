"use client";

import type { GameApi } from "@/lib/api/game-api";
import type { ApiResult } from "@/lib/api/result";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useGameApi } from "@/lib/state/game-api-context";
import { updateResources, useResource } from "@/lib/state/resource-store";
import type { ClaimTaskResult, GameTask, Locale, TaskPeriod } from "@/types/game";
import { invalidateActivity, patchPlayer, refreshPlayer } from "./player-service";

const TASKS_PREFIX = "tasks:";

export const TASK_PERIODS: readonly TaskPeriod[] = ["daily", "weekly", "achievement"];

export function useTasks() {
  const { api } = useGameApi();
  const { locale } = useI18n();
  return useResource(`${TASKS_PREFIX}${locale}`, () => api.getTasks(locale));
}

/** Tasks that still need attention, completed-but-unclaimed first. */
export function activeTasks(tasks: GameTask[], limit: number): GameTask[] {
  return tasks
    .filter((task) => task.status !== "claimed" && task.period !== "achievement")
    .sort((a, b) => Number(b.status === "completed") - Number(a.status === "completed") || b.progress / b.target - a.progress / a.target)
    .slice(0, limit);
}

export function taskSummary(tasks: GameTask[]): { done: number; total: number } {
  return { done: tasks.filter((task) => task.status !== "in_progress").length, total: tasks.length };
}

/** Reward amounts come from the backend response, never from the client-side task object. */
export async function claimTaskReward(api: GameApi, locale: Locale, taskId: string): Promise<ApiResult<ClaimTaskResult>> {
  const result = await api.claimTaskReward(taskId);
  if (result.ok) {
    const { balanceUsd, rewardUsd } = result.data;
    updateResources<GameTask[]>(TASKS_PREFIX, (tasks) =>
      tasks.map((task) => (task.id === taskId ? { ...task, status: "claimed" } : task)),
    );
    patchPlayer((player) => ({
      ...player,
      usdBalance: balanceUsd,
      dailyChangeUsd: player.dailyChangeUsd === null ? null : player.dailyChangeUsd + rewardUsd,
    }));
    invalidateActivity();
    void refreshPlayer(api, locale);
  }
  return result;
}
