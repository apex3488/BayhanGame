"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Inbox } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, ErrorState, Skeleton, SkeletonList } from "@/components/ui/feedback";
import { Sheet } from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useActivity, usePlayer } from "@/lib/services/player-service";
import { previewOf, useItemLookup } from "@/lib/services/store-service";
import { haptic } from "@/lib/telegram/webapp";
import { ActivityList } from "./activity-list";

function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const activity = useActivity(20);
  return (
    <Sheet open={open} onClose={onClose} title={t.home.notifications} description={t.home.notificationsHint}>
      {activity.data ? (
        activity.data.length > 0 ? (
          <ActivityList items={activity.data} />
        ) : (
          <EmptyState icon={Inbox} title={t.home.noActivity} description={t.home.noActivityHint} className="border-none bg-none" />
        )
      ) : activity.status === "error" ? (
        <ErrorState error={activity.error} onRetry={activity.reload} />
      ) : (
        <SkeletonList rows={4} />
      )}
    </Sheet>
  );
}

export function HomeHeader() {
  const { t, format } = useI18n();
  const player = usePlayer();
  const lookup = useItemLookup();
  const [open, setOpen] = useState(false);
  const data = player.data;

  return (
    <header className="flex items-center justify-between gap-3 animate-fade-up">
      <Logo compact className="md:hidden" />
      <h1 className="hidden truncate text-[26px] font-bold tracking-[-0.03em] md:block">
        {data ? format(t.home.greeting, { name: data.nickname }) : t.nav.home}
      </h1>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t.home.notifications}
          onClick={() => {
            haptic.impact("light");
            setOpen(true);
          }}
          className="press grid size-10 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04] text-mist-300 hover:text-white"
        >
          <Bell className="size-[18px]" aria-hidden />
        </button>
        {data ? (
          <Link
            href="/profile"
            aria-label={t.nav.profile}
            className="press flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] py-1 pr-3 pl-1"
          >
            <Avatar
              name={data.nickname}
              photoUrl={data.photoUrl}
              size={32}
              frame={previewOf(lookup, data.loadout.frame)}
            />
            <span className="flex flex-col leading-none">
              <span className="max-w-24 truncate text-[13px] font-semibold">{data.nickname}</span>
              <span className="mt-0.5 text-[11px] font-medium text-brand-300">
                {t.common.levelShort} {data.level}
              </span>
            </span>
          </Link>
        ) : (
          <Skeleton className="h-10 w-28 rounded-full" />
        )}
      </div>
      {open && <NotificationsSheet open onClose={() => setOpen(false)} />}
    </header>
  );
}
