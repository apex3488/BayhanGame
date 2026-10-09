import { LogoMark } from "./logo";

/** First paint (also the static HTML) shown until the client has read Telegram, language and preferences. */
export function SplashScreen() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-ink-950" role="status" aria-label="BAYHAN GAME">
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="absolute inset-0 scale-150 rounded-full bg-brand-500/35 blur-3xl" aria-hidden />
          <LogoMark size={72} className="relative" />
        </div>
        <p className="mt-6 text-sm font-extrabold tracking-[0.32em] text-white">BAYHAN GAME</p>
        <div className="mt-5 h-0.5 w-28 overflow-hidden rounded-full bg-white/10">
          <div className="skeleton h-full w-full rounded-full bg-brand-500/60" />
        </div>
      </div>
    </div>
  );
}
