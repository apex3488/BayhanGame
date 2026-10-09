/**
 * Domain model shared by every data source (demo, Supabase, HTTP backend).
 * Field names mirror the existing Python bot (bot/database/models/*) where possible,
 * converted to camelCase. Money values are plain numbers in USD (the bot's virtual
 * currency); adapters are responsible for converting Decimal strings.
 */

export type Locale = "ru" | "uz" | "en";

export type CurrencyCode = "USD" | "BTC";

export type Rarity = "common" | "rare" | "epic" | "legendary" | "limited";

export type StoreCategory = "frame" | "badge" | "theme" | "name_style" | "avatar_effect";

export type EquipSlot = StoreCategory;

export interface Loadout {
  frame: string | null;
  badge: string | null;
  theme: string | null;
  name_style: string | null;
  avatar_effect: string | null;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalWagered: number;
  totalWon: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
}

export interface Player {
  telegramId: number | null;
  nickname: string;
  username: string | null;
  photoUrl: string | null;
  level: number;
  xp: number;
  /** XP required to reach the next level; null when the source does not expose it. */
  xpForNextLevel: number | null;
  usdBalance: number;
  btcBalance: number;
  /** Bank deposit balance (users.bank_usd in the bot); null when unavailable. */
  bankUsd: number | null;
  /** Balance change for the current day; null when no trustworthy data exists. */
  dailyChangeUsd: number | null;
  registeredAt: string | null;
  dailyStreak: number;
  /** ISO timestamp when the next daily reward becomes available; null = available now. */
  nextDailyAt: string | null;
  stats: PlayerStats;
  loadout: Loadout;
}

export interface StoreItem {
  id: string;
  category: StoreCategory;
  name: string;
  description: string;
  rarity: Rarity;
  priceUsd: number;
  purchasable: boolean;
  isLimited: boolean;
  limitedQuantity: number | null;
  soldCount: number | null;
  featured: boolean;
  /** Visual preset key understood by components/store/item-preview. */
  preview: string;
}

export interface InventoryEntry {
  itemId: string;
  acquiredAt: string;
  serialNo: number | null;
  source: "purchase" | "reward" | "event" | "admin";
}

export type LeaderboardCategory = "capital" | "level" | "wins";

export interface LeaderboardEntry {
  rank: number;
  telegramId: number | null;
  nickname: string;
  photoUrl: string | null;
  level: number;
  value: number;
  isCurrentPlayer: boolean;
  frame: string | null;
}

export interface Leaderboard {
  category: LeaderboardCategory;
  entries: LeaderboardEntry[];
  /** Current player's row even if outside the requested range; null if unranked/unknown. */
  me: LeaderboardEntry | null;
  updatedAt: string | null;
}

export type TaskPeriod = "daily" | "weekly" | "achievement";

export type TaskStatus = "in_progress" | "completed" | "claimed";

export interface GameTask {
  id: string;
  period: TaskPeriod;
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardUsd: number;
  rewardXp: number;
  status: TaskStatus;
  /** Lucide icon key, resolved in components/tasks. */
  icon: TaskIcon;
}

export type TaskIcon = "gamepad" | "trophy" | "pickaxe" | "users" | "coins" | "bag" | "flame" | "target" | "crown";

/** Mirrors bot/constants.py TX_* ledger types that are meaningful to show in the UI. */
export type TransactionType =
  | "GAME_WIN"
  | "GAME_BET"
  | "DAILY_REWARD"
  | "QUEST_REWARD"
  | "REFERRAL_REWARD"
  | "COSMETIC_BUY"
  | "SHOP_BUY"
  | "BANK_DEPOSIT"
  | "PROMO_REWARD"
  | "OTHER";

export interface Transaction {
  id: string;
  type: TransactionType;
  currency: CurrencyCode;
  amount: number;
  createdAt: string;
  /** Short context such as the game code ("mines", "slots") or item id. */
  context: string | null;
}

export interface DailyRewardResult {
  rewardUsd: number;
  streak: number;
  nextDailyAt: string;
  balanceUsd: number;
}

export interface PurchaseResult {
  itemId: string;
  balanceUsd: number;
  inventory: InventoryEntry[];
}

export interface ClaimTaskResult {
  taskId: string;
  rewardUsd: number;
  balanceUsd: number;
}
