"use client";

import { useMemo, useState } from "react";
import { PackageOpen, SearchX, Wallet } from "lucide-react";
import { ConnectionBanner } from "@/components/layout/connection-banner";
import { DemoChip } from "@/components/layout/demo-notice";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Chips, Segmented } from "@/components/ui/controls";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { useFormat } from "@/lib/hooks/use-format";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { usePlayer } from "@/lib/services/player-service";
import {
  filterCatalog,
  getItemState,
  loadoutPreviews,
  RARITIES,
  STORE_CATEGORIES,
  useCatalog,
  useInventory,
  type StoreFilter,
} from "@/lib/services/store-service";
import type { Rarity, StoreItem } from "@/types/game";
import { ItemDetailSheet } from "./item-detail-sheet";
import { StoreItemCard } from "./store-item-card";

type Tab = "catalog" | "inventory";

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-[196px] rounded-[var(--radius-card)]" />
      ))}
    </div>
  );
}

export function StoreScreen() {
  const { t } = useI18n();
  const fmt = useFormat();
  const catalog = useCatalog();
  const inventory = useInventory();
  const player = usePlayer();
  const [tab, setTab] = useState<Tab>("catalog");
  const [category, setCategory] = useState<StoreFilter>("all");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = useMemo(() => catalog.data ?? [], [catalog.data]);
  const lookup = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const owned = useMemo(() => new Set((inventory.data ?? []).map((entry) => entry.itemId)), [inventory.data]);
  const previews = loadoutPreviews(player.data?.loadout, lookup);
  const selected = selectedId ? lookup.get(selectedId) : undefined;

  const visible = useMemo(() => {
    if (tab === "inventory") return items.filter((item) => owned.has(item.id));
    return filterCatalog(items, category, rarity);
  }, [tab, items, owned, category, rarity]);

  const stateOf = (item: StoreItem) =>
    getItemState(item, { owned, loadout: player.data?.loadout ?? null, balanceUsd: player.data?.usdBalance ?? null });

  const loading = !catalog.data || (tab === "inventory" && !inventory.data);
  const error = catalog.status === "error" ? catalog : tab === "inventory" && inventory.status === "error" ? inventory : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.store.title}
        subtitle={t.store.subtitle}
        actions={
          <span className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">
            <Wallet className="size-4 text-brand-300" aria-hidden />
            {player.data ? (
              <span className="tabular text-sm font-semibold">{fmt.usd(player.data.usdBalance)}</span>
            ) : (
              <span className="text-[12px] text-mist-500">—</span>
            )}
            <DemoChip />
          </span>
        }
      />
      <ConnectionBanner />

      <Segmented
        label={t.store.title}
        value={tab}
        onChange={setTab}
        options={[
          { value: "catalog", label: t.store.catalog },
          { value: "inventory", label: `${t.store.inventory}${inventory.data ? ` · ${inventory.data.length}` : ""}` },
        ]}
      />

      {tab === "catalog" && (
        <div className="space-y-2.5">
          <Chips
            label={t.store.filters}
            value={category}
            onChange={setCategory}
            options={[
              { value: "all", label: t.store.categories.all },
              ...STORE_CATEGORIES.map((value) => ({ value, label: t.store.categories[value] })),
              { value: "limited", label: t.store.categories.limited },
            ]}
          />
          <Chips
            label={t.store.rarityLabel}
            value={rarity}
            onChange={setRarity}
            options={[
              { value: "all", label: `${t.store.rarityLabel}: ${t.store.rarityAll}` },
              ...RARITIES.map((value) => ({ value, label: t.store.rarity[value] })),
            ]}
          />
        </div>
      )}

      {error ? (
        <ErrorState error={error.error} onRetry={error.reload} />
      ) : loading ? (
        <GridSkeleton />
      ) : visible.length === 0 ? (
        tab === "inventory" ? (
          <EmptyState
            icon={PackageOpen}
            title={t.store.inventoryEmpty}
            description={t.store.inventoryEmptyHint}
            action={
              <Button size="sm" onClick={() => setTab("catalog")}>
                {t.store.toCatalog}
              </Button>
            }
          />
        ) : (
          <EmptyState icon={SearchX} title={t.store.emptyFilter} description={t.store.emptyFilterHint} />
        )
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visible.map((item) => (
            <StoreItemCard key={item.id} item={item} state={stateOf(item)} onSelect={(next) => setSelectedId(next.id)} />
          ))}
        </div>
      )}

      {selected && (
        <ItemDetailSheet
          item={selected}
          player={player.data}
          owned={owned}
          previews={previews}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
