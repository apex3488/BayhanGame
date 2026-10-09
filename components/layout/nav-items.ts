import {
  Building2,
  Gamepad2,
  House,
  ListChecks,
  Settings,
  ShoppingBag,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: (t: Dictionary) => string;
}

export const PRIMARY_NAV: readonly NavItem[] = [
  { href: "/", icon: House, label: (t) => t.nav.home },
  { href: "/games", icon: Gamepad2, label: (t) => t.nav.games },
  { href: "/city", icon: Building2, label: (t) => t.nav.city },
  { href: "/store", icon: ShoppingBag, label: (t) => t.nav.store },
  { href: "/profile", icon: UserRound, label: (t) => t.nav.profile },
];

export const SECONDARY_NAV: readonly NavItem[] = [
  { href: "/leaderboard", icon: Trophy, label: (t) => t.nav.leaderboard },
  { href: "/tasks", icon: ListChecks, label: (t) => t.nav.tasks },
  { href: "/settings", icon: Settings, label: (t) => t.nav.settings },
];

export function normalizePath(pathname: string | null): string {
  if (!pathname) return "/";
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
