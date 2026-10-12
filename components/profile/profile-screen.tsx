"use client";

import Link from "next/link";
import { ChevronRight, ListChecks, Settings, Shield } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth/auth-provider";
import { useFormat } from "@/lib/hooks/use-format";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { Landmark, Wallet } from "lucide-react";

function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function ProfileScreen() {
  const { t, format } = useI18n();
  const fmt = useFormat();
  const { user, logout } = useAuth();

  if (!user) return null;

  const xpNext = user.level * 1000;
  const memberSince = user.created_at ? fmt.date(user.created_at) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.profile.title}
        subtitle={`@${user.login}`}
        actions={
          <Link
            href="/settings"
            aria-label={t.nav.settings}
            className="press grid size-10 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04] text-mist-300 hover:text-white"
          >
            <Settings className="size-[18px]" aria-hidden />
          </Link>
        }
      />

      <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(59,130,246,0.35),transparent_55%),linear-gradient(180deg,#0f1a30,#080c15)]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[22px_22px]" />
        <div className="relative flex flex-col items-center px-5 pt-8 pb-6 text-center">
          <Avatar name={user.display_name} photoUrl={null} size={96} />
          <p className="mt-5 text-[22px] font-bold tracking-[-0.02em] text-white">{user.display_name}</p>
          <span className="mt-2 inline-flex h-6 items-center rounded-full border border-brand-400/30 bg-brand-500/15 px-2.5 text-[12px] font-semibold text-brand-100">
            {t.common.level} {user.level}
            {user.is_admin ? " · Admin" : ""}
          </span>
          {memberSince && (
            <p className="mt-2 text-[12px] text-mist-300">{format(t.profile.memberSince, { date: memberSince })}</p>
          )}
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-white">
            {t.common.level} {user.level}
          </span>
          <span className="tabular text-[12px] text-mist-300">
            {format(t.profile.xpProgress, { xp: fmt.number(user.xp), next: fmt.number(xpNext) })}
          </span>
        </div>
        <ProgressBar className="mt-3" value={user.xp} max={xpNext} label={t.home.progressTitle} />
      </Card>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="surface flex flex-col gap-2 p-3.5">
          <Wallet className="size-4 text-brand-300" />
          <span className="tabular text-[17px] leading-none font-bold tracking-[-0.02em]">{money(user.wallet_usd)}</span>
          <span className="truncate text-[11.5px] text-mist-500">{t.profile.balance}</span>
        </div>
        <div className="surface flex flex-col gap-2 p-3.5">
          <Landmark className="size-4 text-brand-300" />
          <span className="tabular text-[17px] leading-none font-bold tracking-[-0.02em]">{money(user.bank_usd)}</span>
          <span className="truncate text-[11.5px] text-mist-500">{t.profile.bank}</span>
        </div>
      </div>

      <Card className="divide-y divide-white/[0.05] px-1">
        {[
          { href: "/tasks", icon: ListChecks, label: t.nav.tasks },
          { href: "/settings", icon: Settings, label: t.nav.settings },
          ...(user.is_admin ? [{ href: "/admin", icon: Shield, label: "Админка" }] : []),
        ].map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className="press flex items-center gap-3 px-3 py-3.5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-500/12 text-brand-200">
              <Icon className="size-4.5" aria-hidden />
            </span>
            <span className="flex-1 text-sm font-medium">{label}</span>
            <ChevronRight className="size-4 text-mist-500" aria-hidden />
          </Link>
        ))}
      </Card>

      <Button variant="secondary" block onClick={logout}>
        Выход
      </Button>
    </div>
  );
}
