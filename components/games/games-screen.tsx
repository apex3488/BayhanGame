"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/ui/card";
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
