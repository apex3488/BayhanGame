"use client";

import { Avatar } from "@/components/ui/avatar";
import { BadgeIcon, StyledName, themeClass } from "@/components/store/item-visuals";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils/cn";

export interface LoadoutPreviews {
  frame: string | null;
  badge: string | null;
  theme: string | null;
  name_style: string | null;
  avatar_effect: string | null;
}

interface ProfileIdentityProps {
  name: string;
  photoUrl: string | null;
  level: number;
  previews: LoadoutPreviews;
  subtitle?: string;
  size?: "md" | "lg";
  className?: string;
}

export function ProfileIdentity({ name, photoUrl, level, previews, subtitle, size = "lg", className }: ProfileIdentityProps) {
  const { t } = useI18n();
  const large = size === "lg";
  return (
    <div className={cn("relative overflow-hidden rounded-[1.5rem] border border-white/10", themeClass(previews.theme), className)}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950/80" aria-hidden />
      <div className={cn("relative flex flex-col items-center text-center", large ? "px-5 pt-8 pb-6" : "px-4 pt-6 pb-5")}>
        <Avatar name={name} photoUrl={photoUrl} size={large ? 96 : 68} frame={previews.frame} effect={previews.avatar_effect} />
        <div className={cn("flex max-w-full items-center gap-2", large ? "mt-5" : "mt-4")}>
          <StyledName
            name={name}
            preview={previews.name_style}
            className={cn("truncate font-bold tracking-[-0.02em]", large ? "text-[22px]" : "text-[17px]")}
          />
          {previews.badge && <BadgeIcon preview={previews.badge} size={large ? 28 : 22} />}
        </div>
        <span className="mt-2 inline-flex h-6 items-center rounded-full border border-brand-400/30 bg-brand-500/15 px-2.5 text-[12px] font-semibold text-brand-100">
          {t.common.level} {level}
        </span>
        {subtitle && <p className="mt-2 text-[12px] text-mist-300">{subtitle}</p>}
      </div>
    </div>
  );
}
