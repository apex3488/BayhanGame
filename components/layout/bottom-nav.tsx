"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { haptic } from "@/lib/telegram/webapp";
import { cn } from "@/lib/utils/cn";
import { isActive, normalizePath, PRIMARY_NAV } from "./nav-items";

export function BottomNav() {
  const { t } = useI18n();
  const pathname = normalizePath(usePathname());

  return (
    <nav
      aria-label={t.nav.mainNavigation}
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] pb-safe md:hidden"
    >
      <ul className="mx-auto grid h-[var(--nav-height)] max-w-xl grid-cols-5 px-2">
        {PRIMARY_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="relative">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => !active && haptic.selection()}
                className={cn(
                  "press flex h-full flex-col items-center justify-center gap-1 text-[10.5px] font-medium",
                  active ? "text-white" : "text-mist-500 hover:text-mist-300",
                )}
              >
                <span
                  className={cn(
                    "nav-indicator absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full transition-opacity duration-300",
                    active ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "grid h-7 w-12 place-items-center rounded-full transition-all duration-300",
                    active && "bg-brand-500/15 shadow-[0_0_18px_-4px_rgb(36_107_253/0.8)]",
                  )}
                >
                  <Icon className={cn("size-[21px] transition-colors", active && "text-brand-300")} strokeWidth={active ? 2.3 : 1.9} aria-hidden />
                </span>
                <span className="max-w-full truncate px-0.5">{item.label(t)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
