/**
 * Row types for the planned Supabase schema (see docs/SUPABASE_SETUP.md).
 * Regenerate with `supabase gen types typescript` once the real schema exists.
 *
 * Only `store_items` and the `leaderboard_entries` view are readable with the anon key.
 * Everything player-specific is served by a trusted Edge Function / backend that
 * verifies Telegram initData, so RLS denies direct anon access to those tables.
 */

import type { CurrencyCode, LeaderboardCategory, Rarity, StoreCategory, TaskIcon, TaskPeriod, TaskStatus } from "@/types/game";

export type LocalizedJson = { ru?: string; uz?: string; en?: string };

export interface PlayerRow {
  id: string;
  telegram_id: number;
  nickname: string | null;
  username: string | null;
  photo_url: string | null;
  level: number;
  xp: number;
  usd_balance: number;
  btc_balance: number;
  bank_usd: number;
  games_played: number;
  games_won: number;
  games_lost: number;
  total_wagered: number;
  total_won: number;
  daily_streak: number;
  last_daily_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerLoadoutRow {
  player_id: string;
  frame_item_id: string | null;
  badge_item_id: string | null;
  theme_item_id: string | null;
  name_style_item_id: string | null;
  avatar_effect_item_id: string | null;
}

export interface PlayerInventoryRow {
  id: string;
  player_id: string;
  item_id: string;
  serial_no: number | null;
  source: "purchase" | "reward" | "event" | "admin";
  acquired_at: string;
}

export interface StoreItemRow {
  id: string;
  category: StoreCategory;
  name: LocalizedJson;
  description: LocalizedJson;
  rarity: Rarity;
  price_usd: number;
  purchasable: boolean;
  is_limited: boolean;
  limited_quantity: number | null;
  sold_count: number;
  featured: boolean;
  preview: string;
  enabled: boolean;
  sort_order: number;
}

export interface PlayerAchievementRow {
  player_id: string;
  achievement_code: string;
  unlocked_at: string;
}

export interface TaskRow {
  id: string;
  period: TaskPeriod;
  title: LocalizedJson;
  description: LocalizedJson;
  target: number;
  reward_usd: number;
  reward_xp: number;
  icon: TaskIcon;
  active: boolean;
  sort_order: number;
}

export interface PlayerTaskRow {
  player_id: string;
  task_id: string;
  period_key: string;
  progress: number;
  status: TaskStatus;
  claimed_at: string | null;
}

export interface TransactionRow {
  id: string;
  player_id: string;
  type: string;
  currency: CurrencyCode;
  amount: number;
  balance_before: number;
  balance_after: number;
  context: string | null;
  created_at: string;
}

export interface LeaderboardEntryRow {
  category: LeaderboardCategory;
  rank: number;
  public_id: string;
  nickname: string;
  photo_url: string | null;
  level: number;
  value: number;
  frame_item_id: string | null;
  updated_at: string;
}

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      players: Table<PlayerRow>;
      player_loadouts: Table<PlayerLoadoutRow>;
      player_inventory: Table<PlayerInventoryRow>;
      store_items: Table<StoreItemRow>;
      player_achievements: Table<PlayerAchievementRow>;
      tasks: Table<TaskRow>;
      player_tasks: Table<PlayerTaskRow>;
      transactions: Table<TransactionRow>;
    };
    Views: {
      leaderboard_entries: { Row: LeaderboardEntryRow; Relationships: [] };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
