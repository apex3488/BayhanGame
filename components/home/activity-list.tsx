"use client";

import { ArrowDownLeft, ArrowUpRight, Gift, Landmark, ShoppingBag, Sparkles, Ticket, Trophy, UserPlus, type LucideIcon } from "lucide-react";
import { useFormat } from "@/lib/hooks/use-format";
import { useNow } from "@/lib/hooks/use-now";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils/cn";
import type { Transaction, TransactionType } from "@/types/game";

const ICONS: Record<TransactionType, LucideIcon> = {
  GAME_WIN: Trophy,
  GAME_BET: ArrowUpRight,
  DAILY_REWARD: Gift,
  QUEST_REWARD: Sparkles,
  REFERRAL_REWARD: UserPlus,
  COSMETIC_BUY: ShoppingBag,
  SHOP_BUY: ShoppingBag,
  BANK_DEPOSIT: Landmark,
  PROMO_REWARD: Ticket,
  OTHER: ArrowDownLeft,
};

const GAME_NAMES: Record<string, string> = { mines: "Mines", updown: "Up / Down", slots: "Slots", casino: "Casino" };

export function ActivityList({ items }: { items: Transaction[] }) {
  const { t } = useI18n();
  const fmt = useFormat();
  const now = useNow();

  return (
    <ul className="divide-y divide-white/[0.05]">
      {items.map((tx) => {
        const Icon = ICONS[tx.type] ?? ArrowDownLeft;
        const positive = tx.amount > 0;
        const context = tx.context ? GAME_NAMES[tx.context] : undefined;
        return (
          <li key={tx.id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl border",
                positive ? "border-brand-400/25 bg-brand-500/12 text-brand-200" : "border-white/[0.07] bg-white/[0.04] text-mist-300",
              )}
            >
              <Icon className="size-4.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {t.tx[tx.type] ?? t.tx.OTHER}
                {context && <span className="text-mist-500"> · {context}</span>}
              </p>
              <p className="text-[12px] text-mist-500">{fmt.relative(tx.createdAt, now || undefined)}</p>
            </div>
            <span className={cn("tabular text-sm font-semibold", positive ? "text-brand-200" : "text-mist-300")}>
              {tx.currency === "BTC" ? `${tx.amount > 0 ? "+" : ""}${fmt.btc(tx.amount)} BTC` : fmt.signedUsd(tx.amount)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
