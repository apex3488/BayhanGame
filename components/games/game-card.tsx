"use client";

import Link from "next/link";
import { ArrowUpRight, Play } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { botUrl } from "@/lib/config/env";
import type { GameMode } from "@/lib/games/catalog";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { openTelegramUrl } from "@/lib/telegram/webapp";
import { cn } from "@/lib/utils/cn";
import { GameArt } from "./game-art";

function StatusPill({ mode }: { mode: GameMode }) {
  const { t } = useI18n();
  const label = mode.kind === "practice" ? t.games.practiceAvailable : mode.kind === "bot" ? t.games.botOnly : t.games.challenges;
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10px] font-bold tracking-[0.08em] uppercase",
        mode.kind === "bot" ? "bg-white/[0.07] text-mist-300" : "bg-brand-500/15 text-brand-200",
      )}
    >
      <span className={cn("size-1.5 rounded-full", mode.kind === "bot" ? "bg-mist-300" : "bg-brand-300")} />
      {label}
    </span>
  );
}

/** Compact vertical tile for the home screen rail. */
export function GameTile({ mode }: { mode: GameMode }) {
  const { t } = useI18n();
  return (
    <Link
      href={mode.href ?? "/games"}
      className="press surface flex w-[148px] shrink-0 flex-col p-2.5 hover:border-brand-400/30"
    >
      <GameArt mode={mode} className="h-24 w-full" />
      <span className="mt-2.5 px-1 text-sm font-semibold">{t.games.modes[mode.id].name}</span>
      <span className="mt-1 mb-0.5 px-1">
        <StatusPill mode={mode} />
      </span>
    </Link>
  );
}

/** Full-width card for the games list. */
export function GameCard({ mode }: { mode: GameMode }) {
  const { t } = useI18n();
  const copy = t.games.modes[mode.id];
  const url = botUrl();

  return (
    <article className="surface flex gap-3.5 p-3 animate-fade-up">
      <GameArt mode={mode} className="size-[88px] shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-[15px] font-semibold">{copy.name}</h3>
          <StatusPill mode={mode} />
        </div>
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-mist-300">{copy.description}</p>
        <div className="mt-auto pt-2.5">
          {mode.href ? (
            <ButtonLink href={mode.href} size="sm" icon={<Play className="size-3.5 fill-current" aria-hidden />}>
              {mode.kind === "practice" ? t.games.practice : t.games.play}
            </ButtonLink>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              disabled={!url}
              title={url ? undefined : t.games.botNotConfigured}
              onClick={() => url && openTelegramUrl(url)}
              icon={<ArrowUpRight className="size-3.5" aria-hidden />}
            >
              {url ? t.games.openInBot : t.games.botNotConfigured}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
