import type {
  ClaimTaskResult,
  DailyRewardResult,
  GameTask,
  InventoryEntry,
  Leaderboard,
  LeaderboardEntry,
  Loadout,
  Player,
  PurchaseResult,
  StoreItem,
  Transaction,
} from "@/types/game";

/** Runtime shape checks for backend responses. Deliberately shallow but strict on the fields the UI relies on. */

type Guard<T> = (value: unknown) => value is T;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const str = (v: unknown): v is string => typeof v === "string";
const strOrNull = (v: unknown) => v === null || typeof v === "string";
const numOrNull = (v: unknown) => v === null || num(v);

export function arrayOf<T>(guard: Guard<T>): Guard<T[]> {
  return (value: unknown): value is T[] => Array.isArray(value) && value.every(guard);
}

export const isLoadout: Guard<Loadout> = (v): v is Loadout =>
  isRecord(v) &&
  strOrNull(v.frame) &&
  strOrNull(v.badge) &&
  strOrNull(v.theme) &&
  strOrNull(v.name_style) &&
  strOrNull(v.avatar_effect);

export const isPlayer: Guard<Player> = (v): v is Player =>
  isRecord(v) &&
  numOrNull(v.telegramId) &&
  str(v.nickname) &&
  num(v.level) &&
  num(v.xp) &&
  num(v.usdBalance) &&
  num(v.btcBalance) &&
  numOrNull(v.bankUsd) &&
  isRecord(v.stats) &&
  num(v.stats.gamesPlayed) &&
  num(v.stats.gamesWon) &&
  isLoadout(v.loadout);

export const isStoreItem: Guard<StoreItem> = (v): v is StoreItem =>
  isRecord(v) && str(v.id) && str(v.category) && str(v.name) && str(v.rarity) && num(v.priceUsd) && str(v.preview);

export const isInventoryEntry: Guard<InventoryEntry> = (v): v is InventoryEntry =>
  isRecord(v) && str(v.itemId) && str(v.acquiredAt);

export const isTransaction: Guard<Transaction> = (v): v is Transaction =>
  isRecord(v) && str(v.id) && str(v.type) && num(v.amount) && str(v.createdAt);

const isLeaderboardEntry: Guard<LeaderboardEntry> = (v): v is LeaderboardEntry =>
  isRecord(v) && num(v.rank) && str(v.nickname) && num(v.value) && num(v.level);

export const isLeaderboard: Guard<Leaderboard> = (v): v is Leaderboard =>
  isRecord(v) && str(v.category) && arrayOf(isLeaderboardEntry)(v.entries) && (v.me === null || isLeaderboardEntry(v.me));

export const isGameTask: Guard<GameTask> = (v): v is GameTask =>
  isRecord(v) && str(v.id) && str(v.period) && str(v.title) && num(v.target) && num(v.progress) && str(v.status);

export const isDailyRewardResult: Guard<DailyRewardResult> = (v): v is DailyRewardResult =>
  isRecord(v) && num(v.rewardUsd) && num(v.balanceUsd) && str(v.nextDailyAt);

export const isPurchaseResult: Guard<PurchaseResult> = (v): v is PurchaseResult =>
  isRecord(v) && str(v.itemId) && num(v.balanceUsd) && arrayOf(isInventoryEntry)(v.inventory);

export const isClaimTaskResult: Guard<ClaimTaskResult> = (v): v is ClaimTaskResult =>
  isRecord(v) && str(v.taskId) && num(v.rewardUsd) && num(v.balanceUsd);
