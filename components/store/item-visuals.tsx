"use client";

import { Crown, Gem, Hexagon, Rocket, Star, Trophy, Zap, type LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils/cn";
import type { Rarity, StoreItem } from "@/types/game";

const BADGE_ICONS: Record<string, LucideIcon> = {
  "badge-bolt": Zap,
  "badge-gem": Gem,
  "badge-crown": Crown,
  "badge-star": Star,
  "badge-trophy": Trophy,
  "badge-rocket": Rocket,
};

const THEMES = new Set(["theme-carbon", "theme-grid", "theme-stars", "theme-circuit", "theme-aurora"]);

export function themeClass(preview: string | null | undefined): string {
  return preview && THEMES.has(preview) ? preview : "theme-default";
}

export function BadgeIcon({ preview, size = 40, className }: { preview: string | null | undefined; size?: number; className?: string }) {
  const Icon = (preview && BADGE_ICONS[preview]) || Hexagon;
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Hexagon className="absolute size-full fill-brand-500/20 text-brand-400/70" strokeWidth={1.4} />
      <Icon className="relative text-white" style={{ width: size * 0.42, height: size * 0.42 }} strokeWidth={2.2} />
    </span>
  );
}

/** Apply a nickname style preset (mirrors the bot's style_payload "wrap" values). */
export function StyledName({ name, preview, className }: { name: string; preview: string | null | undefined; className?: string }) {
  switch (preview) {
    case "ns-brackets":
      return <span className={className}>『 {name} 』</span>;
    case "ns-diamond":
      return (
        <span className={className}>
          <span className="text-brand-300">◆</span> {name} <span className="text-brand-300">◆</span>
        </span>
      );
    case "ns-bayhan":
      return (
        <span className={className}>
          <span className="font-bold tracking-wider text-brand-400">BAYHAN</span> <span className="text-mist-500">•</span> {name}
        </span>
      );
    case "ns-glow":
      return <span className={cn("ns-glow", className)}>{name}</span>;
    default:
      return <span className={className}>{name}</span>;
  }
}

export function RarityTag({ rarity, className }: { rarity: Rarity; className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        `rarity-${rarity}`,
        "inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-bold tracking-[0.08em] uppercase",
        "border-[color:var(--rarity)]/40 bg-[color:var(--rarity-soft)] text-[color:var(--rarity)]",
        className,
      )}
    >
      {t.store.rarity[rarity]}
    </span>
  );
}

/** Visual preview of a store item, sized to fill its container. */
export function ItemPreview({ item, large = false }: { item: StoreItem; large?: boolean }) {
  const { t } = useI18n();
  const avatarSize = large ? 96 : 58;

  switch (item.category) {
    case "frame":
      return <Avatar name="B" size={avatarSize} frame={item.preview} />;
    case "avatar_effect":
      return <Avatar name="B" size={avatarSize} effect={item.preview} />;
    case "badge":
      return <BadgeIcon preview={item.preview} size={large ? 88 : 56} />;
    case "theme":
      return (
        <span
          className={cn(themeClass(item.preview), "block rounded-xl border border-white/10", large ? "h-28 w-44" : "h-16 w-24")}
          aria-hidden
        />
      );
    case "name_style":
      return (
        <StyledName
          name={t.common.player}
          preview={item.preview}
          className={cn("font-semibold whitespace-nowrap", large ? "text-xl" : "text-[13px]")}
        />
      );
  }
}
