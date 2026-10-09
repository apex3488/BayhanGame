"use client";

import { Check, Lock, Sparkles } from "lucide-react";
import { useFormat } from "@/lib/hooks/use-format";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { limitedLeft, type ItemState } from "@/lib/services/store-service";
import { cn } from "@/lib/utils/cn";
import type { StoreItem } from "@/types/game";
import { ItemPreview, RarityTag } from "./item-visuals";

interface StoreItemCardProps {
  item: StoreItem;
  state: ItemState;
  onSelect: (item: StoreItem) => void;
}

function StateLine({ item, state }: { item: StoreItem; state: ItemState }) {
  const { t } = useI18n();
  const fmt = useFormat();
  switch (state) {
    case "equipped":
      return (
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-200">
          <Check className="size-3.5" aria-hidden /> {t.store.equipped}
        </span>
      );
    case "owned":
      return <span className="text-[12px] font-semibold text-mist-300">{t.store.owned}</span>;
    case "locked":
      return (
        <span className="inline-flex items-center gap-1 text-[12px] text-mist-500">
          <Lock className="size-3" aria-hidden /> {t.store.notPurchasable}
        </span>
      );
    case "sold_out":
      return <span className="text-[12px] text-mist-500">{t.store.soldOut}</span>;
    default:
      return (
        <span className={cn("tabular text-[13px] font-bold", state === "insufficient" ? "text-mist-500" : "text-white")}>
          {fmt.usd(item.priceUsd)}
        </span>
      );
  }
}

export function StoreItemCard({ item, state, onSelect }: StoreItemCardProps) {
  const { t, format } = useI18n();
  const left = limitedLeft(item);

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={cn(
        `rarity-${item.rarity}`,
        "press surface group relative flex flex-col overflow-hidden p-2.5 text-left hover:border-[color:var(--rarity)]/40",
        item.rarity === "epic" && "rarity-glow-epic",
        item.rarity === "legendary" && "rarity-glow-legendary",
        item.rarity === "limited" && "rarity-glow-limited",
        state === "equipped" && "border-brand-400/50",
      )}
    >
      <span className="relative grid h-[104px] place-items-center overflow-hidden rounded-[14px] border border-white/[0.06] bg-[radial-gradient(80%_80%_at_50%_30%,var(--rarity-soft),transparent_75%),#070b13]">
        {item.rarity === "limited" && <span className="limited-shimmer absolute inset-0" aria-hidden />}
        <ItemPreview item={item} />
        {item.featured && (
          <span className="absolute top-2 left-2 grid size-6 place-items-center rounded-full bg-black/50" title={t.store.featured}>
            <Sparkles className="size-3.5 text-brand-200" aria-label={t.store.featured} />
          </span>
        )}
      </span>
      <span className="mt-2.5 flex items-center justify-between gap-1.5 px-0.5">
        <span className="truncate text-[13.5px] font-semibold">{item.name}</span>
      </span>
      <span className="mt-1.5 flex items-center justify-between gap-1.5 px-0.5">
        <RarityTag rarity={item.rarity} />
        {left !== null && (
          <span
            className="tabular text-[10.5px] text-mist-500"
            title={format(t.store.limitedLeft, { left, total: item.limitedQuantity ?? 0 })}
          >
            {left}/{item.limitedQuantity}
          </span>
        )}
      </span>
      <span className="mt-2.5 border-t border-white/[0.06] px-0.5 pt-2">
        <StateLine item={item} state={state} />
      </span>
    </button>
  );
}
