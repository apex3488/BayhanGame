"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { MIN_BET, practiceChips, usePracticeChips } from "@/lib/games/practice-chips";
import { randomFloat } from "@/lib/games/rng";
import { useFormat } from "@/lib/hooks/use-format";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { haptic } from "@/lib/telegram/webapp";
import { cn } from "@/lib/utils/cn";
import { BetInput } from "../bet-input";
import { PracticeShell } from "../practice-shell";
import { PriceChart } from "./price-chart";

/** UPDOWN_DEFAULT_CONFIG.payout_mult in the bot. */
const PAYOUT = 1.9;
const ROUND_MS = 5_000;

function roundDeadline(): number {
  return Date.now() + ROUND_MS;
}
const TICK_MS = 400;
const HISTORY = 60;
const START_PRICE = 65_967;

type Direction = "up" | "down";

interface Round {
  direction: Direction;
  bet: number;
  entry: number;
  endsAt: number;
}

interface Outcome {
  direction: Direction;
  entry: number;
  exit: number;
  payout: number;
  bet: number;
}

function nextPrice(price: number): number {
  return Math.max(1, price * (1 + (randomFloat() - 0.5) * 0.0035));
}

function initialSeries(): number[] {
  const series = [START_PRICE];
  for (let i = 1; i < HISTORY; i += 1) series.push(nextPrice(series[i - 1] ?? START_PRICE));
  return series;
}

export function UpDownGame() {
  const { t, format } = useI18n();
  const fmt = useFormat();
  const toast = useToast();
  const chips = usePracticeChips();
  const [bet, setBet] = useState(1_000);
  const [points, setPoints] = useState(initialSeries);
  const [round, setRound] = useState<Round | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const priceRef = useRef(points[points.length - 1] ?? START_PRICE);
  const roundRef = useRef<Round | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const price = nextPrice(priceRef.current);
      priceRef.current = price;
      setPoints((series) => [...series.slice(-(HISTORY - 1)), price]);

      const active = roundRef.current;
      if (!active) return;
      const remaining = active.endsAt - Date.now();
      if (remaining > 0) {
        setSecondsLeft(Math.ceil(remaining / 1000));
        return;
      }
      roundRef.current = null;
      const won = active.direction === "up" ? price > active.entry : price < active.entry;
      const payout = price === active.entry ? active.bet : won ? Math.round(active.bet * PAYOUT) : 0;
      if (payout > 0) practiceChips.add(payout);
      haptic.notify(payout > active.bet ? "success" : "error");
      setRound(null);
      setOutcome({ direction: active.direction, entry: active.entry, exit: price, payout, bet: active.bet });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  function place(direction: Direction) {
    if (bet > chips) {
      toast({ tone: "error", title: t.games.notEnoughChips });
      return;
    }
    practiceChips.add(-bet);
    const next: Round = { direction, bet, entry: priceRef.current, endsAt: roundDeadline() };
    roundRef.current = next;
    setRound(next);
    setOutcome(null);
    setSecondsLeft(ROUND_MS / 1000);
    haptic.impact("medium");
  }

  const price = points[points.length - 1] ?? START_PRICE;
  const priceText = price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <PracticeShell mode="updown">
      <section className="surface overflow-hidden" aria-label={t.games.modes.updown.name}>
        <div className="flex items-end justify-between px-4 pt-4">
          <div>
            <p className="text-[12px] text-mist-500">{t.updown.price}</p>
            <p className="tabular text-[26px] leading-tight font-bold tracking-[-0.03em]">${priceText}</p>
          </div>
          <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[12px] font-semibold text-brand-200">
            {format(t.updown.payout, { m: PAYOUT })}
          </span>
        </div>
        <PriceChart points={points} entry={round?.entry ?? null} label={t.updown.chart} />
        <div className="border-t border-white/[0.06] px-4 py-3 text-center text-sm" role="status" aria-live="polite">
          {round ? (
            <span className="font-semibold text-brand-100">{format(t.updown.waiting, { s: secondsLeft })}</span>
          ) : outcome ? (
            <span className="font-semibold animate-fade-in">
              {outcome.payout > outcome.bet
                ? format(t.games.youWon, { amount: fmt.number(outcome.payout) })
                : outcome.payout === outcome.bet
                  ? `${t.updown.result}: ±0`
                  : t.games.youLost}
              <span className="ml-2 font-normal text-mist-500">
                {t.updown.entry} {outcome.entry.toFixed(2)} → {outcome.exit.toFixed(2)}
              </span>
            </span>
          ) : (
            <span className="text-mist-300">{t.updown.hint}</span>
          )}
        </div>
      </section>

      <section className="surface space-y-4 p-4">
        <BetInput value={bet} onChange={setBet} max={chips} disabled={round !== null} />
        <div className="grid grid-cols-2 gap-3">
          {(["up", "down"] as const).map((direction) => (
            <Button
              key={direction}
              size="lg"
              variant={direction === "up" ? "primary" : "white"}
              disabled={round !== null || chips < MIN_BET}
              onClick={() => place(direction)}
              className={cn(round?.direction === direction && "ring-2 ring-brand-300")}
              icon={direction === "up" ? <ArrowUp className="size-4.5" aria-hidden /> : <ArrowDown className="size-4.5" aria-hidden />}
            >
              {direction === "up" ? t.updown.up : t.updown.down}
            </Button>
          ))}
        </div>
      </section>
    </PracticeShell>
  );
}
