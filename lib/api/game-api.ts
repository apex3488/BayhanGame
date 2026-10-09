import type {
  ClaimTaskResult,
  DailyRewardResult,
  EquipSlot,
  GameTask,
  InventoryEntry,
  Leaderboard,
  LeaderboardCategory,
  Locale,
  Loadout,
  Player,
  PurchaseResult,
  StoreItem,
  Transaction,
} from "@/types/game";
import type { ApiResult } from "./result";

export type DataSourceKind = "demo" | "supabase" | "api";

/**
 * Contract between the Mini App UI and whichever backend provides game data.
 *
 * Every mutating call (purchase, equip, claim) MUST be validated by a trusted server
 * that verifies Telegram initData. The client only sends intent; it never sends prices,
 * balances or reward amounts.
 */
export interface GameApi {
  readonly kind: DataSourceKind;

  getPlayer(locale: Locale): Promise<ApiResult<Player>>;
  getActivity(locale: Locale, limit: number): Promise<ApiResult<Transaction[]>>;
  claimDailyReward(): Promise<ApiResult<DailyRewardResult>>;

  getStoreCatalog(locale: Locale): Promise<ApiResult<StoreItem[]>>;
  getInventory(): Promise<ApiResult<InventoryEntry[]>>;
  purchaseItem(itemId: string): Promise<ApiResult<PurchaseResult>>;
  equipItem(slot: EquipSlot, itemId: string | null): Promise<ApiResult<Loadout>>;

  getLeaderboard(category: LeaderboardCategory, limit: number): Promise<ApiResult<Leaderboard>>;

  getTasks(locale: Locale): Promise<ApiResult<GameTask[]>>;
  claimTaskReward(taskId: string): Promise<ApiResult<ClaimTaskResult>>;
}
