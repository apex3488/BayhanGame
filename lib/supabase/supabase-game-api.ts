import { env } from "@/lib/config/env";
import type { GameApi } from "@/lib/api/game-api";
import { createHttpGameApi } from "@/lib/api/http-game-api";
import { fail, ok, type ApiResult } from "@/lib/api/result";
import type { Leaderboard, LeaderboardCategory, Locale, StoreItem } from "@/types/game";
import { getSupabaseClient, getSupabaseFunctionUrl } from "./client";
import type { LeaderboardEntryRow, LocalizedJson, StoreItemRow } from "./types";

function pickLocale(text: LocalizedJson, locale: Locale): string {
  return text[locale] ?? text.ru ?? text.en ?? "";
}

function mapStoreItem(row: StoreItemRow, locale: Locale): StoreItem {
  return {
    id: row.id,
    category: row.category,
    name: pickLocale(row.name, locale),
    description: pickLocale(row.description, locale),
    rarity: row.rarity,
    priceUsd: Number(row.price_usd),
    purchasable: row.purchasable,
    isLimited: row.is_limited,
    limitedQuantity: row.limited_quantity,
    soldCount: row.sold_count,
    featured: row.featured,
    preview: row.preview,
  };
}

function mapLeaderboard(category: LeaderboardCategory, rows: LeaderboardEntryRow[]): Leaderboard {
  return {
    category,
    entries: rows.map((row) => ({
      rank: row.rank,
      telegramId: null,
      nickname: row.nickname,
      photoUrl: row.photo_url,
      level: row.level,
      value: Number(row.value),
      // The public view never exposes Telegram IDs; the player's own row comes from the backend.
      isCurrentPlayer: false,
      frame: row.frame_item_id,
    })),
    me: null,
    updatedAt: rows[0]?.updated_at ?? null,
  };
}

/**
 * Supabase-backed GameApi:
 *  - public, read-only data (catalog, leaderboard) via supabase-js + RLS `select` policies;
 *  - player data and every mutation via an Edge Function that verifies Telegram initData.
 */
export function createSupabaseGameApi(initData: string): GameApi | null {
  const supabase = getSupabaseClient();
  const functionUrl = getSupabaseFunctionUrl();
  if (!supabase || !functionUrl || !env.supabaseAnonKey) return null;

  const backend = createHttpGameApi({
    kind: "supabase",
    baseUrl: functionUrl,
    initData,
    extraHeaders: { apikey: env.supabaseAnonKey, Authorization: `Bearer ${env.supabaseAnonKey}` },
  });

  const getStoreCatalog = async (locale: Locale): Promise<ApiResult<StoreItem[]>> => {
    const { data, error } = await supabase
      .from("store_items")
      .select("*")
      .eq("enabled", true)
      .order("sort_order", { ascending: true });
    if (error) return fail("network", error.message);
    return ok((data ?? []).map((row) => mapStoreItem(row, locale)));
  };

  const getLeaderboard = async (category: LeaderboardCategory, limit: number): Promise<ApiResult<Leaderboard>> => {
    const { data, error } = await supabase
      .from("leaderboard_entries")
      .select("*")
      .eq("category", category)
      .order("rank", { ascending: true })
      .limit(limit);
    if (error) return fail("network", error.message);
    const board = mapLeaderboard(category, data ?? []);

    const mine = await backend.getLeaderboard(category, 1);
    if (mine.ok && mine.data.me) {
      const me = mine.data.me;
      board.me = me;
      board.entries = board.entries.map((entry) => (entry.rank === me.rank ? { ...entry, isCurrentPlayer: true } : entry));
    }
    return ok(board);
  };

  return { ...backend, getStoreCatalog, getLeaderboard };
}
