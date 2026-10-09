import type { EquipSlot, LeaderboardCategory, Locale } from "@/types/game";
import type { DataSourceKind, GameApi } from "./game-api";
import { fail, type ApiErrorCode, type ApiResult } from "./result";

/**
 * Live data source was requested but cannot be used (missing config, no Telegram
 * initData, etc.). Every call fails with a clear code — never returns demo data.
 */
export function createUnavailableGameApi(kind: DataSourceKind, code: ApiErrorCode, detail?: string): GameApi {
  const blocked = <T,>(): Promise<ApiResult<T>> => Promise.resolve(fail(code, detail));

  return {
    kind,
    getPlayer: (_locale: Locale) => blocked(),
    getActivity: (_locale: Locale, _limit: number) => blocked(),
    claimDailyReward: () => blocked(),
    getStoreCatalog: (_locale: Locale) => blocked(),
    getInventory: () => blocked(),
    purchaseItem: (_itemId: string) => blocked(),
    equipItem: (_slot: EquipSlot, _itemId: string | null) => blocked(),
    getLeaderboard: (_category: LeaderboardCategory, _limit: number) => blocked(),
    getTasks: (_locale: Locale) => blocked(),
    claimTaskReward: (_taskId: string) => blocked(),
  };
}
