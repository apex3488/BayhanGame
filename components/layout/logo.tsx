import { cn } from "@/lib/utils/cn";

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden className={className}>
      <defs>
        <linearGradient id="bayhan-mark" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1A56D6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#bayhan-mark)" />
      <rect x="2.5" y="2.5" width="43" height="43" rx="12.5" stroke="white" strokeOpacity="0.22" />
      <path
        d="M16 13h10.2c4.6 0 7.6 2.4 7.6 6.1 0 2.4-1.3 4.2-3.4 5 2.8.7 4.6 2.8 4.6 5.6 0 4.1-3.3 6.3-8.4 6.3H16V13Zm6 9.2h3.3c1.7 0 2.7-.8 2.7-2.1s-1-2.1-2.7-2.1H22v4.2Zm0 9.6h3.9c1.9 0 3-.8 3-2.3 0-1.4-1.1-2.3-3-2.3H22v4.6Z"
        fill="white"
      />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={compact ? 30 : 34} />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-extrabold tracking-[0.14em] text-white">BAYHAN</span>
        <span className="mt-1 text-[10px] font-semibold tracking-[0.42em] text-brand-300">GAME</span>
      </span>
    </span>
  );
}
