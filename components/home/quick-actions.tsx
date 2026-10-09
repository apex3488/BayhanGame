"use client";

import Link from "next/link";
import { Building2, Gamepad2, ShoppingBag, Trophy, type LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { haptic } from "@/lib/telegram/webapp";
import { cn } from "@/lib/utils/cn";

export function QuickActions() {
  const { t } = useI18n();
  const actions: { href: string; label: string; icon: LucideIcon; primary?: boolean }[] = [
    { href: "/games", label: t.home.quickPlay, icon: Gamepad2, primary: true },
    { href: "/city", label: t.home.quickCity, icon: Building2 },
    { href: "/store", label: t.home.quickStore, icon: ShoppingBag },
    { href: "/leaderboard", label: t.home.quickTop, icon: Trophy },
  ];

  return (
    <nav aria-label={t.home.quickActions} className="grid grid-cols-4 gap-2.5 animate-fade-up">
      {actions.map(({ href, label, icon: Icon, primary }) => (
        <Link
          key={href}
          href={href}
          onClick={() => haptic.impact("light")}
          className="press group flex flex-col items-center gap-2 rounded-2xl py-1"
        >
          <span
            className={cn(
              "grid size-14 place-items-center rounded-[18px] border transition-colors",
              primary
                ? "border-brand-300/40 bg-gradient-to-b from-brand-400 to-brand-600 text-white shadow-[0_12px_28px_-12px_rgb(36_107_253/0.95)]"
                : "border-white/[0.08] bg-white/[0.04] text-brand-200 group-hover:border-brand-400/40 group-hover:bg-brand-500/10",
            )}
          >
            <Icon className="size-[22px]" aria-hidden />
          </span>
          <span className="max-w-full truncate text-[12px] font-medium text-mist-300 group-hover:text-white">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
