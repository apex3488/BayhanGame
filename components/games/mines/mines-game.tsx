"use client";

import { useState } from "react";
import { Bomb, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { maxSafeCells, MINES_BOARD_SIZE, MINES_OPTIONS, minesMultiplier, placeMines, type MinesCount } from "@/lib/games/mines";
import { MIN_BET, practiceChips, usePracticeChips } from "@/lib/games/practice-chips";
import { useFormat } from "@/lib/hooks/use-format";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { haptic } from "@/lib/telegram/webapp";
import { cn } from "@/lib/utils/cn";
import { BetInput } from "../bet-input";
import { PracticeShell } from "../practice-shell";

type Phase = "setup" | "playing" | "lost" | "cashed";

interface Round {
  mines: Set<number>;
  opened: Set<number>;
  hit: number | null;
}

export function MinesGame() {
  const { t, format } = useI18n();
  const fmt = useFormat();
  const toast = useToast();
  const chips = usePracticeChips();
  const [bet, setBet] = useState(1_000);
  const [count, setCount] = useState<MinesCount>(3);
  const [phase, setPhase] = useState<Phase>("setup");
  const [round, setRound] = useState<Round | null>(null);
  const [lastWin, setLastWin] = useState(0);

  const opened = round?.opened.size ?? 0;
  const multiplier = minesMultiplier(count, opened);
  const nextMultiplier = minesMultiplier(count, opened + 1);
  const playing = phase === "playing";
  const finished = phase === "lost" || phase === "cashed";

  function start() {
    if (bet > chips) {
      toast({ tone: "error", title: t.games.notEnoughChips });
      return;
    }
    practiceChips.add(-bet);
    setRound({ mines: placeMines(count), opened: new Set(), hit: null });
    setPhase("playing");
    haptic.impact("medium");
  }

  function cashOut(current: Round) {
    const win = Math.round(bet * minesMultiplier(count, current.opened.size));
    practiceChips.add(win);
    setLastWin(win);
    setPhase("cashed");
    haptic.notify("success");
  }

  function open(index: number) {
    if (!round || !playing || round.opened.has(index)) return;
    if (round.mines.has(index)) {
      setRound({ ...round, hit: index });
      setPhase("lost");
      haptic.notify("error");
      return;
    }
    const next = { ...round, opened: new Set(round.opened).add(index) };
    setRound(next);
    haptic.impact("light");
    if (next.opened.size >= maxSafeCells(count)) cashOut(next);
  }

  return (
    <PracticeShell mode="mines">
      <section className="surface p-4" aria-label={t.games.modes.mines.name}>
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          {[
            { label: t.mines.multiplier, value: `×${multiplier.toFixed(2)}`, accent: true },
            { label: t.mines.nextMultiplier, value: `×${nextMultiplier.toFixed(2)}` },
            { label: t.mines.opened, value: `${opened}/${maxSafeCells(count)}` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-black/25 px-2 py-2">
              <p className="text-[10.5px] text-mist-500">{stat.label}</p>
              <p className={cn("tabular mt-0.5 text-[15px] font-bold", stat.accent && "text-brand-200")}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className={cn("mx-auto grid max-w-[360px] grid-cols-5 gap-2", phase === "lost" && "animate-shake")}>
          {Array.from({ length: MINES_BOARD_SIZE }, (_, index) => {
            const isMine = round?.mines.has(index) ?? false;
            const isOpen = round?.opened.has(index) ?? false;
            const revealed = isOpen || (finished && round !== null);
            const state = !revealed ? "hidden" : isMine ? "mine" : "safe";
            return (
              <button
                key={index}
                type="button"
                data-state={state}
                disabled={!playing || isOpen}
                onClick={() => open(index)}
                aria-label={format(t.mines.cell, { n: index + 1 })}
                className={cn(
                  "mine-cell press grid aspect-square place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04]",
                  revealed && !isOpen && "opacity-45",
                  round?.hit === index && "!opacity-100 ring-2 ring-white",
                )}
              >
                {revealed && (isMine ? <Bomb className="size-5 animate-pop text-white" aria-hidden /> : <Gem className="size-5 animate-pop text-brand-100" aria-hidden />)}
              </button>
            );
          })}
        </div>

        {finished && (
          <p role="status" className="mt-4 text-center text-sm font-semibold animate-fade-in">
            {phase === "lost" ? t.mines.boom : format(t.mines.cashedOut, { amount: fmt.number(lastWin) })}
          </p>
        )}
      </section>

      <section className="surface space-y-4 p-4">
        {playing ? (
          <Button size="lg" block disabled={opened === 0} onClick={() => round && cashOut(round)}>
            {format(t.mines.cashout, { amount: fmt.number(Math.round(bet * multiplier)) })}
          </Button>
        ) : (
          <>
            <BetInput value={bet} onChange={setBet} max={chips} />
            <div>
              <p className="mb-2 text-[12px] font-medium text-mist-300">{t.mines.mines}</p>
              <Segmented
                label={t.mines.mines}
                options={MINES_OPTIONS.map((value) => ({ value, label: String(value) }))}
                value={count}
                onChange={setCount}
              />
            </div>
            <Button size="lg" block onClick={start} disabled={chips < MIN_BET}>
              {t.mines.start}
            </Button>
          </>
        )}
      </section>
    </PracticeShell>
  );
}
