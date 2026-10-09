"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { ProfileIdentity, type LoadoutPreviews } from "@/components/profile/profile-identity";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useFormat } from "@/lib/hooks/use-format";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { equipItem, getItemState, limitedLeft, purchaseItem } from "@/lib/services/store-service";
import { useGameApi } from "@/lib/state/game-api-context";
import type { Player, StoreItem } from "@/types/game";
import { ItemPreview, RarityTag } from "./item-visuals";

interface ItemDetailSheetProps {
  item: StoreItem;
  player: Player | undefined;
  owned: ReadonlySet<string>;
  previews: LoadoutPreviews;
  onClose: () => void;
}

export function ItemDetailSheet({ item, player, owned, previews, onClose }: ItemDetailSheetProps) {
  const { t, format } = useI18n();
  const fmt = useFormat();
  const toast = useToast();
  const { api, isDemo } = useGameApi();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const balance = player?.usdBalance ?? null;
  const state = getItemState(item, { owned, loadout: player?.loadout ?? null, balanceUsd: balance });
  const left = limitedLeft(item);

  async function buy() {
    setBusy(true);
    const result = await purchaseItem(api, item.id);
    setBusy(false);
    setConfirming(false);
    if (result.ok) {
      toast({ tone: "success", title: item.name, description: isDemo ? t.demo.purchaseDone : t.store.purchaseConfirmed });
    } else {
      toast({ tone: "error", title: t.errors[result.error.code] });
    }
  }

  async function toggleEquip(equip: boolean) {
    setBusy(true);
    const result = await equipItem(api, item.category, equip ? item.id : null);
    setBusy(false);
    toast(result.ok ? { tone: "success", title: equip ? t.store.equipDone : t.store.unequipDone } : { tone: "error", title: t.errors[result.error.code] });
  }

  const footer = confirming ? (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-mist-300">{t.store.balanceAfter}</span>
        <span className="tabular font-semibold">{balance === null ? "—" : fmt.usdFull(balance - item.priceUsd)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
          {t.common.cancel}
        </Button>
        <Button onClick={buy} loading={busy}>
          {t.common.confirm}
        </Button>
      </div>
    </div>
  ) : state === "available" ? (
    <Button block size="lg" onClick={() => setConfirming(true)}>
      {format(t.store.buyFor, { price: fmt.usdFull(item.priceUsd) })}
    </Button>
  ) : state === "owned" ? (
    <Button block size="lg" onClick={() => toggleEquip(true)} loading={busy}>
      {t.store.equip}
    </Button>
  ) : state === "equipped" ? (
    <Button block size="lg" variant="secondary" onClick={() => toggleEquip(false)} loading={busy}>
      {t.store.unequip}
    </Button>
  ) : (
    <Button block size="lg" disabled icon={state === "locked" ? <Lock className="size-4" aria-hidden /> : undefined}>
      {state === "insufficient" ? t.store.insufficient : state === "locked" ? t.store.notPurchasable : t.store.soldOut}
    </Button>
  );

  return (
    <Sheet
      open
      onClose={onClose}
      title={confirming ? t.store.confirmTitle : item.name}
      description={confirming ? format(t.store.confirmText, { item: item.name, price: fmt.usdFull(item.priceUsd) }) : t.store.categories[item.category]}
      footer={footer}
    >
      <div className={`rarity-${item.rarity} space-y-5`}>
        <div className="relative grid h-44 place-items-center overflow-hidden rounded-2xl border border-white/[0.07] bg-[radial-gradient(70%_80%_at_50%_35%,var(--rarity-soft),transparent_75%),#070b13]">
          {item.rarity === "limited" && <span className="limited-shimmer absolute inset-0" aria-hidden />}
          <ItemPreview item={item} large />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RarityTag rarity={item.rarity} />
          {state === "equipped" && <span className="text-[12px] font-semibold text-brand-200">{t.store.equipped}</span>}
          {state === "owned" && <span className="text-[12px] font-semibold text-mist-300">{t.store.owned}</span>}
          {item.purchasable && (
            <span className="tabular ml-auto text-lg font-bold">{fmt.usdFull(item.priceUsd)}</span>
          )}
        </div>

        <p className="text-sm leading-relaxed text-mist-300">{item.description}</p>

        {left !== null && item.limitedQuantity !== null && (
          <div className="space-y-2">
            <ProgressBar value={item.limitedQuantity - left} max={item.limitedQuantity} label={t.store.categories.limited} />
            <p className="tabular text-[12px] text-mist-500">{format(t.store.limitedLeft, { left, total: item.limitedQuantity })}</p>
          </div>
        )}

        {player && (
          <div>
            <p className="mb-2.5 text-[12px] font-medium text-mist-300">{t.store.previewOnProfile}</p>
            <ProfileIdentity
              name={player.nickname}
              photoUrl={player.photoUrl}
              level={player.level}
              previews={{ ...previews, [item.category]: item.preview }}
              size="md"
            />
          </div>
        )}
      </div>
    </Sheet>
  );
}
