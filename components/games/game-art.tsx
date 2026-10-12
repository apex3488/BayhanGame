import { Bomb, Gem } from "lucide-react";
import type { GameMode } from "@/lib/games/catalog";
import { cn } from "@/lib/utils/cn";

/** Small CSS/SVG illustration that gives each mode its own recognisable card. */
export function GameArt({ mode, className }: { mode: GameMode; className?: string }) {
  const Icon = mode.icon;
  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-2xl border border-white/[0.08] bg-[radial-gradient(90%_80%_at_50%_0%,rgb(36_107_253/0.35),transparent_70%),linear-gradient(180deg,#0f1a30,#080c15)]",
        className,
      )}
      aria-hidden
    >
      {mode.id === "mines" && (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }, (_, index) => (
            <span
              key={index}
              className={cn(
                "grid size-5 place-items-center rounded-md border",
                index === 4 ? "border-white/70 bg-white/20" : index === 1 || index === 6 ? "border-brand-300/70 bg-brand-500/40" : "border-white/10 bg-white/[0.04]",
              )}
            >
              {index === 4 && <Bomb className="size-3 text-white" />}
              {index === 1 && <Gem className="size-3 text-white" />}
            </span>
          ))}
        </div>
      )}
      {mode.id === "updown" && (
        <svg viewBox="0 0 100 56" className="h-[62%] w-[82%]">
          <defs>
            <linearGradient id="updown-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#3B82F6" stopOpacity="0.55" />
              <stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 44 L14 38 L26 41 L38 28 L50 32 L62 18 L74 24 L86 10 L100 14 L100 56 L0 56 Z" fill="url(#updown-fill)" />
          <path d="M0 44 L14 38 L26 41 L38 28 L50 32 L62 18 L74 24 L86 10 L100 14" fill="none" stroke="#A9C6FF" strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx="86" cy="10" r="3.2" fill="#fff" />
        </svg>
      )}
      {mode.id === "slots" && (
        <div className="flex gap-1">
          {["7", "7", "7"].map((symbol, index) => (
            <span
              key={index}
              className="grid h-9 w-7 place-items-center rounded-md border border-white/15 bg-black/40 text-lg font-black text-white shadow-[inset_0_-8px_12px_-6px_rgb(36_107_253/0.6)]"
            >
              {symbol}
            </span>
          ))}
        </div>
      )}
      {mode.id === "crash" && (
        <svg viewBox="0 0 100 56" className="h-[70%] w-[85%]">
          <defs>
            <linearGradient id="crash-line" x1="0" x2="1" y1="1" y2="0">
              <stop offset="0" stopColor="#2563eb" />
              <stop offset="1" stopColor="#93c5fd" />
            </linearGradient>
          </defs>
          <path d="M6 48 C28 46, 40 34, 52 24 S78 8, 88 6" fill="none" stroke="url(#crash-line)" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="88" cy="6" r="4" fill="#fff" />
          <path d="M88 6 L96 2 L92 12 Z" fill="#ef4444" />
        </svg>
      )}
      {mode.id !== "mines" && mode.id !== "updown" && mode.id !== "slots" && mode.id !== "crash" && (
        <span className="relative grid size-12 place-items-center rounded-full border border-brand-300/40 bg-brand-500/20">
          <span className="absolute inset-[-8px] rounded-full border border-brand-400/15" />
          <Icon className="size-6 text-white" />
        </span>
      )}
    </div>
  );
}
