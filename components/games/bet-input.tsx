"use client";

import { Minus, Plus } from "lucide-react";
import { MIN_BET } from "@/lib/games/practice-chips";
import { useFormat } from "@/lib/hooks/use-format";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { haptic } from "@/lib/telegram/webapp";
import { cn } from "@/lib/utils/cn";

const PRESETS = [100, 500, 1_000, 5_000] as const;

interface BetInputProps {
  value: number;
  onChange: (value: number) => void;
  max: number;
  disabled?: boolean;
}

export function BetInput({ value, onChange, max, disabled }: BetInputProps) {
  const { t } = useI18n();
  const fmt = useFormat();
  const clamp = (next: number) => Math.max(MIN_BET, Math.min(Math.max(MIN_BET, max), Math.round(next)));
  const step = (direction: 1 | -1) => {
    haptic.selection();
    onChange(clamp(direction === 1 ? value * 2 : value / 2));
  };

  return (
    <fieldset disabled={disabled} className="space-y-2.5 disabled:opacity-60">
      <legend className="sr-only">{t.games.bet}</legend>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="÷2"
          className="press grid size-11 shrink-0 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-mist-300 hover:text-white"
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <label className="flex h-11 min-w-0 flex-1 items-center rounded-2xl border border-white/[0.08] bg-black/30 px-4 focus-within:border-brand-400/60">
          <span className="mr-2 text-[12px] text-mist-500">{t.games.bet}</span>
          <input
            inputMode="numeric"
            value={value}
            onChange={(event) => {
              const digits = Number(event.target.value.replace(/\D/g, ""));
              onChange(Number.isFinite(digits) ? Math.min(digits, Math.max(MIN_BET, max)) : MIN_BET);
            }}
            onBlur={() => onChange(clamp(value))}
            className="tabular w-full min-w-0 bg-transparent text-right text-[15px] font-semibold outline-none"
            aria-label={t.games.bet}
          />
        </label>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="×2"
          className="press grid size-11 shrink-0 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-mist-300 hover:text-white"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={preset > max}
            onClick={() => {
              haptic.selection();
              onChange(preset);
            }}
            className={cn(
              "press h-8 rounded-xl border text-[12px] font-semibold disabled:opacity-40",
              value === preset ? "border-brand-400/60 bg-brand-500/15 text-white" : "border-white/[0.07] bg-white/[0.03] text-mist-300",
            )}
          >
            {fmt.number(preset)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
