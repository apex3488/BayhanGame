"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Rocket, Wallet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { miniappFetch, newIdempotencyKey } from "@/lib/api/miniapp-client";
import { useAuth } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils/cn";

interface CrashState {
  round: {
    public_id: string;
    server_seed_hash: string;
    status: string;
    started_at: string | null;
  };
  active_bet: {
    id: number;
    stake_usd: number;
    status: string;
    payout_usd: number;
    cashout_multiplier: number | null;
    created_at?: string | null;
  } | null;
  history: Array<{ public_id: string; crash_multiplier: number }>;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

/** Same curve as server: 1.00x + 0.15x per second. */
function growthFromElapsed(elapsedSec: number): number {
  return Number((1 + Math.max(0, elapsedSec) * 0.15).toFixed(2));
}

export function CrashScreen() {
  const { user, refresh } = useAuth();
  const [state, setState] = useState<CrashState | null>(null);
  const [stake, setStake] = useState(100);
  const [mult, setMult] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "flying" | "cashed" | "crashed">("idle");
  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Array<{ t: number; m: number }>>([]);
  /** Local flight clock — never reuse a stale round.started_at from a previous round. */
  const flightStartRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    const data = await miniappFetch<CrashState>("/api/crash/state");
    setState(data);
    if (data.active_bet && data.round.status === "running") {
      setPhase("flying");
      // Prefer bet.created_at (this stake), not an old round.started_at.
      if (flightStartRef.current == null) {
        const fromBet = data.active_bet.created_at ? Date.parse(data.active_bet.created_at) : NaN;
        flightStartRef.current = Number.isFinite(fromBet) ? fromBet : Date.now();
      }
    } else if (!data.active_bet) {
      flightStartRef.current = null;
      setPhase((p) => (p === "flying" ? "idle" : p));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((e: Error) => setError(e.message));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const flying = phase === "flying" && Boolean(state?.active_bet);

  useEffect(() => {
    if (!flying) return;
    if (flightStartRef.current == null) flightStartRef.current = Date.now();
    const start = flightStartRef.current;
    pointsRef.current = [{ t: 0, m: 1 }];
    setMult(1);
    const id = window.setInterval(() => {
      const elapsed = Math.max(0, (Date.now() - start) / 1000);
      const next = growthFromElapsed(elapsed);
      setMult(next);
      pointsRef.current.push({ t: elapsed, m: next });
      if (pointsRef.current.length > 240) pointsRef.current.shift();
    }, 40);
    return () => window.clearInterval(id);
  }, [flying, state?.active_bet?.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const pts = pointsRef.current;
      const last = pts.length > 1 ? pts[pts.length - 1] : undefined;
      if (last) {
        const maxT = Math.max(last.t, 1);
        const maxM = Math.max(last.m, 2);
        const grad = ctx.createLinearGradient(0, h, w, 0);
        grad.addColorStop(0, "#2563eb");
        grad.addColorStop(1, phase === "crashed" ? "#ef4444" : "#93c5fd");
        ctx.beginPath();
        pts.forEach((p, i) => {
          const x = (p.t / maxT) * (w - 24) + 12;
          const y = h - 16 - ((p.m - 1) / (maxM - 1)) * (h - 36);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.stroke();

        const lx = (last.t / maxT) * (w - 24) + 12;
        const ly = h - 16 - ((last.m - 1) / (maxM - 1)) * (h - 36);
        ctx.beginPath();
        ctx.arc(lx, ly, 6, 0, Math.PI * 2);
        ctx.fillStyle = phase === "crashed" ? "#f87171" : "#fff";
        ctx.fill();
        ctx.shadowColor = phase === "crashed" ? "#ef4444" : "#3b82f6";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(lx, ly, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = "rgba(148,163,184,0.45)";
        ctx.font = "600 13px ui-sans-serif, system-ui";
        ctx.fillText("Ожидание ставки…", 16, h / 2);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [phase, mult]);

  async function placeBet() {
    setBusy(true);
    setError(null);
    setLastPayout(null);
    try {
      const bet = await miniappFetch<{
        id: number;
        created_at?: string;
        round: CrashState["round"];
      }>("/api/crash/bet", {
        method: "POST",
        body: JSON.stringify({ stake_usd: stake, idempotency_key: newIdempotencyKey() }),
      });
      const fromBet = bet.created_at ? Date.parse(bet.created_at) : NaN;
      flightStartRef.current = Number.isFinite(fromBet) ? fromBet : Date.now();
      pointsRef.current = [{ t: 0, m: 1 }];
      setMult(1);
      setPhase("flying");
      await Promise.all([load(), refresh()]);
    } catch (e) {
      flightStartRef.current = null;
      setError(e instanceof Error ? e.message : "Bet failed");
      setPhase("idle");
    } finally {
      setBusy(false);
    }
  }

  async function cashout() {
    if (!state?.active_bet) return;
    setBusy(true);
    setError(null);
    try {
      const res = await miniappFetch<{ payout_usd: number; cashout_multiplier: number | null; status: string }>(
        "/api/crash/cashout",
        {
          method: "POST",
          body: JSON.stringify({
            bet_id: state.active_bet.id,
            displayed_multiplier: mult,
            multiplier: mult,
            idempotency_key: newIdempotencyKey(),
          }),
        },
      );
      setLastPayout(res.payout_usd);
      if (res.cashout_multiplier != null) setMult(res.cashout_multiplier);
      setPhase(res.status === "won" ? "cashed" : "crashed");
      flightStartRef.current = null;
      await Promise.all([load(), refresh()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cashout failed");
      setPhase("crashed");
      flightStartRef.current = null;
      await load().catch(() => undefined);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const potential = Math.floor((state?.active_bet?.stake_usd ?? stake) * mult);
  const quick = [50, 100, 250, 500, 1000];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-brand-200 uppercase">Live · Crash</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Успей забрать до краша</h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-mist-200">
          <Wallet className="size-3.5 text-brand-300" />
          {formatUsd(user?.wallet_usd ?? 0)}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#070b14]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(37,99,235,0.35),transparent_45%),radial-gradient(circle_at_90%_20%,rgba(239,68,68,0.12),transparent_40%)]" />
        <div className="relative flex items-center justify-between px-5 pt-5">
          <div>
            <p
              className={cn(
                "text-6xl font-black tracking-tight tabular-nums sm:text-7xl",
                phase === "crashed" ? "text-red-400" : phase === "cashed" ? "text-emerald-300" : "text-white",
              )}
            >
              {mult.toFixed(2)}
              <span className="text-3xl text-mist-400">x</span>
            </p>
            <p className="mt-1 text-sm text-mist-400">
              {phase === "flying" && "Полёт…"}
              {phase === "idle" && "Сделайте ставку"}
              {phase === "cashed" && lastPayout != null && `Забрано ${formatUsd(lastPayout)}`}
              {phase === "crashed" && "Краш!"}
            </p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-[11px] tracking-wide text-mist-500 uppercase">Round</p>
            <p className="max-w-[9rem] truncate font-mono text-xs text-mist-300">{state?.round.public_id ?? "—"}</p>
          </div>
        </div>
        <canvas ref={canvasRef} className="relative mt-2 h-52 w-full sm:h-64" />
        <div className="relative flex flex-wrap gap-2 px-4 pb-4">
          {(state?.history ?? []).slice(0, 8).map((item) => (
            <span
              key={item.public_id}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                item.crash_multiplier >= 2 ? "bg-brand-500/20 text-brand-100" : "bg-white/5 text-mist-300",
              )}
            >
              {item.crash_multiplier.toFixed(2)}x
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-[1.4rem] border border-white/10 bg-ink-950/70 p-4 backdrop-blur">
        <div className="mb-3 flex flex-wrap gap-2">
          {quick.map((value) => (
            <button
              key={value}
              type="button"
              disabled={Boolean(state?.active_bet)}
              onClick={() => setStake(value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                stake === value ? "bg-brand-500 text-white" : "bg-white/5 text-mist-300 hover:bg-white/10",
              )}
            >
              {formatUsd(value)}
            </button>
          ))}
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-mist-300">Ставка</span>
          <input
            type="number"
            min={1}
            max={10000}
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-lg font-semibold text-white outline-none focus:border-brand-400"
            disabled={Boolean(state?.active_bet)}
          />
        </label>
        <p className="mt-2 text-sm text-mist-300">
          Потенциал: <span className="font-semibold text-white">{formatUsd(potential)}</span>
        </p>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        <div className="mt-4">
          {!state?.active_bet ? (
            <Button block loading={busy} onClick={placeBet} icon={<Rocket className="size-4" />}>
              Поставить {formatUsd(stake)}
            </Button>
          ) : (
            <Button block loading={busy} onClick={cashout} icon={<Zap className="size-4" />}>
              Забрать {formatUsd(potential)}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
