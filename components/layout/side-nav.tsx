"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useGameApi } from "@/lib/state/game-api-context";
import { cn } from "@/lib/utils/cn";
import { Logo } from "./logo";
import { isActive, normalizePath, PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "./nav-items";

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const { t } = useI18n();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "press flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium",
        active ? "bg-brand-500/12 text-white shadow-[inset_0_0_0_1px_rgb(36_107_253/0.35)]" : "text-mist-300 hover:bg-white/5 hover:text-white",
      )}
    >
      <Icon className={cn("size-5", active && "text-brand-300")} aria-hidden />
      {item.label(t)}
    </Link>
  );
}

export function SideNav() {
  const { t } = useI18n();
  const { isDemo } = useGameApi();
  const pathname = normalizePath(usePathname());

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-white/[0.06] px-4 pt-8 pb-6 md:flex">
      <Link href="/" className="mb-8 px-2" aria-label="BAYHAN GAME">
        <Logo />
      </Link>
      <nav aria-label={t.nav.mainNavigation} className="flex flex-1 flex-col gap-1">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
        <div className="my-3 h-px bg-white/[0.06]" />
        {SECONDARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
      {isDemo && (
        <p className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-[12px] leading-relaxed text-mist-500">
          <span className="font-semibold text-brand-300">{t.common.demoTag}</span> · {t.demo.title}
        </p>
      )}
    </aside>
  );
}
