"use client";

import { Rocket } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { GAME_MODES, type GameModeKind } from "@/lib/games/catalog";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { GameCard } from "./game-card";
import { PracticeNotice } from "./practice-shell";

export function GamesScreen() {
  const { t } = useI18n();
  const sections: { kind: GameModeKind; title: string }[] = [
    { kind: "practice", title: t.games.sectionPractice },
    { kind: "challenge", title: t.games.sectionChallenges },
    { kind: "bot", title: t.games.sectionBot },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t.games.title} subtitle={t.games.subtitle} />
      <Card className="flex flex-wrap items-center justify-between gap-4 border-brand-400/25 p-5">
        <div>
          <p className="text-xs tracking-[0.18em] text-brand-200 uppercase">Live economy</p>
          <h2 className="mt-1 text-xl font-bold text-white">Crash</h2>
          <p className="mt-1 text-sm text-mist-300">Серверные ставки и выплаты на виртуальные $</p>
        </div>
        <ButtonLink href="/games/crash" icon={<Rocket className="size-4" />}>
          Открыть Crash
        </ButtonLink>
      </Card>
      <PracticeNotice />
      {sections.map(({ kind, title }) => (
        <Section key={kind} id={`games-${kind}`} title={title}>
          <div className="grid gap-3 md:grid-cols-2">
            {GAME_MODES.filter((mode) => mode.kind === kind).map((mode) => (
              <GameCard key={mode.id} mode={mode} />
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}
