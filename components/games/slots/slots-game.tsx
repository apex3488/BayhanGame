"use client";

import { useEffect, useRef, useState } from "react";
import { Cherry, Citrus, Gem, Grape, Star, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { MIN_BET, practiceChips, usePracticeChips } from "@/lib/games/practice-chips";
import { PAIR_PAYOUT, SLOT_SYMBOLS, slotMultiplier, spinReels, TRIPLE_PAYOUT, type SlotResult, type SlotSymbol } from "@/lib/games/slots";
import { useFormat } from "@/lib/hooks/use-format";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { haptic } from "@/lib/telegram/webapp";
import { cn } from "@/lib/utils/cn";
import { BetInput } from "../bet-input";
import { PracticeShell } from "../practice-shell";

const ICONS: Record<Exclude<SlotSymbol, "seven">, LucideIcon> = { cherry: Cherry, lemon: Citrus, grape: Grape, star: Star, gem: Gem };
const STOP_DELAYS = [650, 1000, 1350] as const;

function SlotGlyph({ symbol, size = "lg" }: { symbol: SlotSymbol; size?: "lg" | "sm" }) {
  if (symbol === "seven") {
    return <span className={cn("leading-none font-black text-white", size === "lg" ? "text-4xl" : "text-base")}>7</span>;
  }
  const Icon = ICONS[symbol];
  return <Icon className={cn(size === "lg" ? "size-9" : "size-4", symbol === "gem" || symbol === "star" ? "text-white" : "text-brand-200")} aria-hidden />;
}

function Reel({ symbol, spinning }: { symbol: SlotSymbol; spinning: boolean }) {
  const loop = [...SLOT_SYMBOLS, ...SLOT_SYMBOLS].map(([value]) => value);
  return (
    <div className="relative h-24 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#05070b,#0d1527_50%,#05070b)] shadow-[inset_0_0_24px_rgb(0_0_0/0.8)]">
      {spinning ? (
        <div className="reel-loop flex flex-col">
          {loop.map((value, index) => (
            <span key={index} className="grid h-24 place-items-center">
              <SlotGlyph symbol={value} />
            </span>
          ))}
        </div>
      ) : (
        <span key={symbol} className="grid h-full place-items-center animate-pop">
          <SlotGlyph symbol={symbol} />
        </span>
      )}
      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-brand-400/25" aria-hidden />
    </div>
  );
}

export function SlotsGame() {
  const { t, format } = useI18n();
  const fmt = useFormat();
  const toast = useToast();
  const chips = usePracticeChips();
  const [bet, setBet] = useState(1_000);
  const [reels, setReels] = useState<SlotResult>(["seven", "seven", "seven"]);
  const [stopped, setStopped] = useState<[boolean, boolean, boolean]>([true, true, true]);
  const [result, setResult] = useState<{ payout: number; bet: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const spinning = stopped.some((value) => !value);

  function spin() {
    if (bet > chips) {
      toast({ tone: "error", title: t.games.notEnoughChips });
      return;
    }
    practiceChips.add(-bet);
    const outcome = spinReels();
    const stake = bet;
    setReels(outcome);
    setResult(null);
    setStopped([false, false, false]);
    haptic.impact("medium");

    timers.current = STOP_DELAYS.map((delay, index) =>
      setTimeout(() => {
        haptic.impact("light");
        setStopped((current) => {
          const next: [boolean, boolean, boolean] = [...current];
          next[index] = true;
          return next;
        });
        if (index === STOP_DELAYS.length - 1) {
          const payout = Math.round(stake * slotMultiplier(outcome));
          if (payout > 0) practiceChips.add(payout);
          haptic.notify(payout > 0 ? "success" : "warning");
          setResult({ payout, bet: stake });
        }
      }, delay),
    );
  }

  return (
    <PracticeShell mode="slots">
      <section className="surface relative overflow-hidden p-4" aria-label={t.slots.reels}>
        <div className="pointer-events-none absolute inset-x-0 -top-20 h-40 bg-brand-500/20 blur-3xl" aria-hidden />
        <div className="relative grid grid-cols-3 gap-2.5">
          {reels.map((symbol, index) => (
            <Reel key={index} symbol={symbol} spinning={!stopped[index]} />
          ))}
        </div>
        <p role="status" aria-live="polite" className="relative mt-4 min-h-5 text-center text-sm font-semibold">
          {result && (result.payout > 0 ? format(t.games.youWon, { amount: fmt.number(result.payout) }) : t.games.youLost)}
        </p>
      </section>

      <section className="surface space-y-4 p-4">
        <BetInput value={bet} onChange={setBet} max={chips} disabled={spinning} />
        <Button size="lg" block onClick={spin} loading={spinning} disabled={chips < MIN_BET}>
          {spinning ? t.slots.spinning : t.slots.spin}
        </Button>
      </section>

      <section className="surface p-4" aria-labelledby="paytable-title">
        <h2 id="paytable-title" className="mb-3 text-sm font-semibold">
          {t.slots.paytable}
        </h2>
        <ul className="grid grid-cols-2 gap-2">
          {SLOT_SYMBOLS.map(([symbol]) => (
            <li key={symbol} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
              <span className="flex items-center gap-1">
                <SlotGlyph symbol={symbol} size="sm" />
                <SlotGlyph symbol={symbol} size="sm" />
                <SlotGlyph symbol={symbol} size="sm" />
              </span>
              <span className="tabular text-[13px] font-semibold text-brand-200">×{TRIPLE_PAYOUT[symbol]}</span>
            </li>
          ))}
          <li className="col-span-2 flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
            <span className="text-[13px] text-mist-300">{t.slots.pair}</span>
            <span className="tabular text-[13px] font-semibold text-brand-200">×{PAIR_PAYOUT}</span>
          </li>
        </ul>
      </section>
    </PracticeShell>
  );
}
