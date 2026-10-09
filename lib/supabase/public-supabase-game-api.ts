import type { GameApi } from "@/lib/api/game-api";
import { createUnavailableGameApi } from "@/lib/api/unavailable-game-api";
import { fail, ok, type ApiResult } from "@/lib/api/result";
import type { Leaderboard, LeaderboardCategory, Locale, StoreItem } from "@/types/game";
import { getSupabaseClient } from "./client";
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

/**
 * Public Supabase reads only (RLS-allowed catalog + leaderboard view).
 * Player endpoints stay unavailable until Telegram initData is present.
 */
export function createPublicSupabaseGameApi(): GameApi | null {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const blocked = createUnavailableGameApi("supabase", "unauthorized", "Telegram initData required");

  const getStoreCatalog = async (locale: Locale): Promise<ApiResult<StoreItem[]>> => {
    const { data, error } = await supabase.from("store_items").select("*").eq("enabled", true).order("sort_order");
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
    const rows = (data ?? []) as LeaderboardEntryRow[];
    return ok({
      category,
      entries: rows.map((row) => ({
        rank: row.rank,
        telegramId: null,
        nickname: row.nickname,
        photoUrl: row.photo_url,
        level: row.level,
        value: Number(row.value),
        isCurrentPlayer: false,
        frame: row.frame_item_id,
      })),
      me: null,
      updatedAt: rows[0]?.updated_at ?? null,
    });
  };

  return { ...blocked, kind: "supabase", getStoreCatalog, getLeaderboard };
}
