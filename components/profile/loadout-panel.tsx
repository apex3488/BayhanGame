"use client";

import { useState } from "react";
import { Check, ChevronRight, PackageOpen } from "lucide-react";
import { ItemPreview } from "@/components/store/item-visuals";
import { ButtonLink } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { equipItem, STORE_CATEGORIES } from "@/lib/services/store-service";
import { useGameApi } from "@/lib/state/game-api-context";
import { cn } from "@/lib/utils/cn";
import type { EquipSlot, Loadout, StoreItem } from "@/types/game";

interface LoadoutPanelProps {
  loadout: Loadout;
  lookup: ReadonlyMap<string, StoreItem>;
  ownedItems: StoreItem[];
}

function SlotSheet({ slot, loadout, items, onClose }: { slot: EquipSlot; loadout: Loadout; items: StoreItem[]; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const { api } = useGameApi();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function select(itemId: string | null) {
    setBusyId(itemId ?? "none");
    const result = await equipItem(api, slot, itemId);
    setBusyId(null);
    if (result.ok) {
      toast({ tone: "success", title: itemId ? t.store.equipDone : t.store.unequipDone });
      onClose();
    } else {
      toast({ tone: "error", title: t.errors[result.error.code] });
    }
  }

  return (
    <Sheet open onClose={onClose} title={t.store.categories[slot]} description={t.profile.loadout}>
      {items.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={t.store.inventoryEmpty}
          description={t.store.inventoryEmptyHint}
          className="border-none bg-none"
          action={
            <ButtonLink href="/store" size="sm">
              {t.store.toCatalog}
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => select(null)}
            className={cn(
              "press surface grid h-32 place-items-center p-3 text-[13px] text-mist-300",
              loadout[slot] === null && "border-brand-400/50 text-white",
            )}
          >
            {t.profile.none}
          </button>
          {items.map((item) => {
            const active = loadout[slot] === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={busyId !== null}
                aria-pressed={active}
                onClick={() => select(item.id)}
                className={cn("press surface relative flex h-32 flex-col items-center justify-center gap-2 p-3", active && "border-brand-400/60 glow-soft")}
              >
                {active && <Check className="absolute top-2 right-2 size-4 text-brand-300" aria-hidden />}
                <ItemPreview item={item} />
                <span className="max-w-full truncate text-[12.5px] font-medium">{item.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

export function LoadoutPanel({ loadout, lookup, ownedItems }: LoadoutPanelProps) {
  const { t } = useI18n();
  const [slot, setSlot] = useState<EquipSlot | null>(null);

  return (
    <Section id="profile-loadout" title={t.profile.loadout} action={{ label: t.nav.store, href: "/store" }}>
      <Card className="divide-y divide-white/[0.05] px-1">
        {STORE_CATEGORIES.map((category) => {
          const item = loadout[category] ? lookup.get(loadout[category] ?? "") : undefined;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setSlot(category)}
              className="press flex w-full items-center gap-3 px-3 py-3 text-left"
            >
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/[0.07] bg-black/30 [&>*]:scale-[0.62]">
                {item ? <ItemPreview item={item} /> : <span className="size-2 rounded-full bg-white/15" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] text-mist-500">{t.store.categories[category]}</span>
                <span className={cn("block truncate text-sm font-medium", !item && "text-mist-300")}>{item?.name ?? t.profile.none}</span>
              </span>
              <span className="text-[12px] font-medium text-brand-300">{t.profile.customize}</span>
              <ChevronRight className="size-4 text-mist-500" aria-hidden />
            </button>
          );
        })}
      </Card>
      {slot && (
        <SlotSheet
          slot={slot}
          loadout={loadout}
          items={ownedItems.filter((item) => item.category === slot)}
          onClose={() => setSlot(null)}
        />
      )}
    </Section>
  );
}
