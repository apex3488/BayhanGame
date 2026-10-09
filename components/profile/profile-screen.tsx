"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, ListChecks, PackageOpen, Settings } from "lucide-react";
import { ConnectionBanner } from "@/components/layout/connection-banner";
import { DemoNotice } from "@/components/layout/demo-notice";
import { PageHeader } from "@/components/layout/page-header";
import { useGameApi } from "@/lib/state/game-api-context";
import { ButtonLink } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { ItemPreview } from "@/components/store/item-visuals";
import { useFormat } from "@/lib/hooks/use-format";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useLeaderboard } from "@/lib/services/leaderboard-service";
import { usePlayer } from "@/lib/services/player-service";
import { loadoutPreviews, useCatalog, useInventory } from "@/lib/services/store-service";
import { LoadoutPanel } from "./loadout-panel";
import { ProfileIdentity } from "./profile-identity";
import { BalanceStats, GameStats, XpCard } from "./profile-stats";

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-64 rounded-[1.5rem]" />
      <Skeleton className="h-24 rounded-[var(--radius-card)]" />
      <div className="grid grid-cols-3 gap-2.5">
        <Skeleton className="h-24 rounded-[var(--radius-card)]" />
        <Skeleton className="h-24 rounded-[var(--radius-card)]" />
        <Skeleton className="h-24 rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}

export function ProfileScreen() {
  const { t, format } = useI18n();
  const fmt = useFormat();
  const { isUnavailable } = useGameApi();
  const player = usePlayer();
  const catalog = useCatalog();
  const inventory = useInventory();
  const board = useLeaderboard("capital", 10);

  const lookup = useMemo(() => new Map((catalog.data ?? []).map((item) => [item.id, item])), [catalog.data]);
  const ownedItems = useMemo(
    () => (inventory.data ?? []).map((entry) => lookup.get(entry.itemId)).filter((item) => item !== undefined),
    [inventory.data, lookup],
  );

  const data = player.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.profile.title}
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
      <DemoNotice />
      <ConnectionBanner />

      {!isUnavailable &&
        (!data ? (
          player.status === "error" ? <ErrorState error={player.error} onRetry={player.reload} /> : <ProfileSkeleton />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-[1.1fr_1fr] md:items-start">
              <ProfileIdentity
                className="animate-fade-up"
                name={data.nickname}
                photoUrl={data.photoUrl}
                level={data.level}
                previews={loadoutPreviews(data.loadout, lookup)}
                subtitle={data.registeredAt ? format(t.profile.memberSince, { date: fmt.date(data.registeredAt) }) : undefined}
              />
              <div className="space-y-4">
                <XpCard player={data} />
                <BalanceStats player={data} />
              </div>
            </div>

            <Section id="profile-stats" title={t.profile.stats}>
              <GameStats player={data} rank={board.data?.me?.rank ?? null} />
            </Section>

            <LoadoutPanel loadout={data.loadout} lookup={lookup} ownedItems={ownedItems} />

            <Section
              id="profile-inventory"
              title={t.profile.inventory}
              aside={<span className="text-[12px] text-mist-500">{format(t.profile.inventoryCount, { n: ownedItems.length })}</span>}
            >
              {inventory.data && catalog.data && ownedItems.length === 0 ? (
                <EmptyState
                  icon={PackageOpen}
                  title={t.store.inventoryEmpty}
                  description={t.store.inventoryEmptyHint}
                  action={
                    <ButtonLink href="/store" size="sm">
                      {t.store.toCatalog}
                    </ButtonLink>
                  }
                />
              ) : inventory.data && catalog.data ? (
                <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
                  {ownedItems.map((item) => (
                    <Link
                      key={item.id}
                      href="/store"
                      className={`rarity-${item.rarity} press surface flex w-28 shrink-0 flex-col items-center gap-2 p-3`}
                    >
                      <span className="grid h-16 place-items-center">
                        <ItemPreview item={item} />
                      </span>
                      <span className="max-w-full truncate text-[12px] font-medium">{item.name}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <Skeleton className="h-28 rounded-[var(--radius-card)]" />
              )}
            </Section>
          </>
        ))}

      <Card className="divide-y divide-white/[0.05] px-1">
        {[
          { href: "/tasks", icon: ListChecks, label: t.nav.tasks },
          { href: "/settings", icon: Settings, label: t.nav.settings },
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
    </div>
  );
}
