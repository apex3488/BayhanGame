"use client";

import { useMemo } from "react";
import type { GameApi } from "@/lib/api/game-api";
import type { ApiResult } from "@/lib/api/result";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useGameApi } from "@/lib/state/game-api-context";
import { updateResources, useResource } from "@/lib/state/resource-store";
import type { EquipSlot, InventoryEntry, Loadout, PurchaseResult, Rarity, StoreCategory, StoreItem } from "@/types/game";
import { invalidateActivity, patchPlayer } from "./player-service";

const CATALOG_PREFIX = "catalog:";
const INVENTORY_KEY = "inventory";

export const STORE_CATEGORIES: readonly StoreCategory[] = ["frame", "badge", "theme", "name_style", "avatar_effect"];
export const RARITIES: readonly Rarity[] = ["common", "rare", "epic", "legendary", "limited"];

export type StoreFilter = StoreCategory | "all" | "limited";

export type ItemState = "equipped" | "owned" | "available" | "insufficient" | "locked" | "sold_out";

export function useCatalog() {
  const { api } = useGameApi();
  const { locale } = useI18n();
  return useResource(`${CATALOG_PREFIX}${locale}`, async () => {
    const result = await api.getStoreCatalog(locale);
    return result.ok ? { ok: true as const, data: sortCatalog(result.data) } : result;
  });
}

export function useInventory() {
  const { api } = useGameApi();
  return useResource(INVENTORY_KEY, () => api.getInventory());
}

/** id → item map for resolving equipped item ids (loadout, leaderboard frames) to their visuals. */
export function useItemLookup(): ReadonlyMap<string, StoreItem> {
  const catalog = useCatalog();
  return useMemo(() => new Map((catalog.data ?? []).map((item) => [item.id, item])), [catalog.data]);
}

export function previewOf(lookup: ReadonlyMap<string, StoreItem>, itemId: string | null | undefined): string | null {
  return itemId ? (lookup.get(itemId)?.preview ?? null) : null;
}

/** Resolve every equipped item id to its visual preset key. */
export function loadoutPreviews(loadout: Loadout | undefined, lookup: ReadonlyMap<string, StoreItem>): Record<EquipSlot, string | null> {
  return {
    frame: previewOf(lookup, loadout?.frame),
    badge: previewOf(lookup, loadout?.badge),
    theme: previewOf(lookup, loadout?.theme),
    name_style: previewOf(lookup, loadout?.name_style),
    avatar_effect: previewOf(lookup, loadout?.avatar_effect),
  };
}

function sortCatalog(items: StoreItem[]): StoreItem[] {
  const rank = (rarity: Rarity) => RARITIES.indexOf(rarity);
  return [...items].sort(
    (a, b) =>
      STORE_CATEGORIES.indexOf(a.category) - STORE_CATEGORIES.indexOf(b.category) ||
      rank(a.rarity) - rank(b.rarity) ||
      a.priceUsd - b.priceUsd,
  );
}

export function filterCatalog(items: StoreItem[], category: StoreFilter, rarity: Rarity | "all"): StoreItem[] {
  return items.filter((item) => {
    const categoryMatch = category === "all" || (category === "limited" ? item.isLimited : item.category === category);
    return categoryMatch && (rarity === "all" || item.rarity === rarity);
  });
}

export function limitedLeft(item: StoreItem): number | null {
  if (!item.isLimited || item.limitedQuantity === null) return null;
  return Math.max(0, item.limitedQuantity - (item.soldCount ?? 0));
}

export function getItemState(
  item: StoreItem,
  context: { owned: ReadonlySet<string>; loadout: Loadout | null; balanceUsd: number | null },
): ItemState {
  if (context.loadout?.[item.category] === item.id) return "equipped";
  if (context.owned.has(item.id)) return "owned";
  if (!item.purchasable) return "locked";
  if (limitedLeft(item) === 0) return "sold_out";
  if (context.balanceUsd !== null && context.balanceUsd < item.priceUsd) return "insufficient";
  return "available";
}

/** The client only sends the item id; price and balance checks happen on the backend. */
export async function purchaseItem(api: GameApi, itemId: string): Promise<ApiResult<PurchaseResult>> {
  const result = await api.purchaseItem(itemId);
  if (result.ok) {
    const { balanceUsd, inventory } = result.data;
    updateResources<InventoryEntry[]>(INVENTORY_KEY, () => inventory);
    patchPlayer((player) => ({ ...player, usdBalance: balanceUsd }));
    invalidateActivity();
    updateResources<StoreItem[]>(CATALOG_PREFIX, (items) =>
      items.map((item) => (item.id === itemId && item.isLimited ? { ...item, soldCount: (item.soldCount ?? 0) + 1 } : item)),
    );
  }
  return result;
}

export async function equipItem(api: GameApi, slot: EquipSlot, itemId: string | null): Promise<ApiResult<Loadout>> {
  const result = await api.equipItem(slot, itemId);
  if (result.ok) patchPlayer((player) => ({ ...player, loadout: result.data }));
  return result;
}
