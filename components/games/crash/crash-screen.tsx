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
    crash_multiplier?: number;
  };
  active_bet: {
    id: number;
    stake_usd: number;
    status: string;
    payout_usd: number;
    cashout_multiplier: number | null;
    created_at?: string | null;
  } | null;
  just_crashed?: { crash_multiplier: number } | null;
  growth_per_sec?: number;
  history: Array<{ public_id: string; crash_multiplier: number }>;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

const DEFAULT_GROWTH = 0.06;

function growthFromElapsed(elapsedSec: number, perSec: number): number {
  return Number((1 + Math.max(0, elapsedSec) * perSec).toFixed(2));
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
  const [crashAt, setCrashAt] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Array<{ t: number; m: number }>>([]);
  const flightStartRef = useRef<number | null>(null);
  const growthRef = useRef(DEFAULT_GROWTH);
  const phaseRef = useRef(phase);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const load = useCallback(async () => {
    const data = await miniappFetch<CrashState>("/api/crash/state");
    if (data.growth_per_sec && data.growth_per_sec > 0) growthRef.current = data.growth_per_sec;
    setState(data);

    if (data.just_crashed) {
      flightStartRef.current = null;
      setCrashAt(data.just_crashed.crash_multiplier);
      setMult(data.just_crashed.crash_multiplier);
      setPhase("crashed");
      await refresh();
      return;
    }

    if (data.active_bet && data.round.status === "running") {
      setPhase("flying");
      if (flightStartRef.current == null) {
        const fromBet = data.active_bet.created_at ? Date.parse(data.active_bet.created_at) : NaN;
        flightStartRef.current = Number.isFinite(fromBet) ? fromBet : Date.now();
      }
    } else if (!data.active_bet && phaseRef.current === "flying") {
      flightStartRef.current = null;
      setPhase("idle");
    }
  }, [refresh]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((e: Error) => setError(e.message));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // Poll server while flying so the round can crash (not infinite).
  useEffect(() => {
    if (phase !== "flying") return;
    const id = window.setInterval(() => {
      void load().catch(() => undefined);
    }, 450);
    return () => window.clearInterval(id);
  }, [phase, load]);

  const flying = phase === "flying" && Boolean(state?.active_bet);

  useEffect(() => {
    if (!flying) return;
    if (flightStartRef.current == null) flightStartRef.current = Date.now();
    const start = flightStartRef.current;
    pointsRef.current = [{ t: 0, m: 1 }];
    const boot = window.setTimeout(() => setMult(1), 0);
    const id = window.setInterval(() => {
      const elapsed = Math.max(0, (Date.now() - start) / 1000);
      const next = growthFromElapsed(elapsed, growthRef.current);
      setMult(next);
      pointsRef.current.push({ t: elapsed, m: next });
      if (pointsRef.current.length > 280) pointsRef.current.shift();
    }, 32);
    return () => {
      window.clearTimeout(boot);
      window.clearInterval(id);
    };
  }, [flying, state?.active_bet?.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const particles: Array<{ x: number; y: number; vx: number; vy: number; life: number }> = [];

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

      // atmosphere
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "rgba(37,99,235,0.18)");
      sky.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(255,255,255,0.045)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const pts = pointsRef.current;
      const last = pts.length > 1 ? pts[pts.length - 1] : undefined;
      if (last) {
        const maxT = Math.max(last.t, 0.8);
        const maxM = Math.max(last.m, 1.8);
        const toXY = (p: { t: number; m: number }) => {
          const x = (p.t / maxT) * (w - 36) + 18;
          const y = h - 22 - ((p.m - 1) / (maxM - 1)) * (h - 48);
          return { x, y };
        };

        // glow fill under curve
        ctx.beginPath();
        pts.forEach((p, i) => {
          const { x, y } = toXY(p);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        const end = toXY(last);
        ctx.lineTo(end.x, h - 8);
        ctx.lineTo(toXY(pts[0]!).x, h - 8);
        ctx.closePath();
        const fill = ctx.createLinearGradient(0, 0, 0, h);
        fill.addColorStop(0, phase === "crashed" ? "rgba(239,68,68,0.28)" : "rgba(59,130,246,0.28)");
        fill.addColorStop(1, "rgba(59,130,246,0)");
        ctx.fillStyle = fill;
        ctx.fill();

        // curve stroke
        ctx.beginPath();
        pts.forEach((p, i) => {
          const { x, y } = toXY(p);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        const grad = ctx.createLinearGradient(0, h, w, 0);
        grad.addColorStop(0, "#1d4ed8");
        grad.addColorStop(1, phase === "crashed" ? "#f87171" : "#bfdbfe");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3.5;
        ctx.lineJoin = "round";
        ctx.stroke();

        // rocket / crash burst
        const { x: lx, y: ly } = end;
        if (phase === "flying" && Math.random() > 0.4) {
          particles.push({
            x: lx - 6,
            y: ly + 2,
            vx: -1.2 - Math.random() * 1.5,
            vy: (Math.random() - 0.5) * 1.4,
            life: 1,
          });
        }
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i]!;
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.04;
          if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = p.life;
          ctx.fillStyle = phase === "crashed" ? "#fca5a5" : "#93c5fd";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.2 * p.life, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        ctx.save();
        ctx.translate(lx, ly);
        const angle = Math.atan2(
          (last.m - (pts[pts.length - 2]?.m ?? last.m)) * -1,
          Math.max(0.05, last.t - (pts[pts.length - 2]?.t ?? last.t)),
        );
        ctx.rotate(angle);
        if (phase === "crashed") {
          ctx.fillStyle = "rgba(248,113,113,0.9)";
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
            ctx.strokeStyle = `rgba(248,113,113,${0.35 + Math.random() * 0.4})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.shadowColor = "#60a5fa";
          ctx.shadowBlur = 18;
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(-8, -6);
          ctx.lineTo(-4, 0);
          ctx.lineTo(-8, 6);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#3b82f6";
          ctx.fillRect(-10, -2, 6, 4);
        }
        ctx.restore();
      } else {
        ctx.fillStyle = "rgba(148,163,184,0.5)";
        ctx.font = "600 13px ui-sans-serif, system-ui";
        ctx.fillText("Сделайте ставку — ракета стартует с 1.00x", 16, h / 2);
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
    setCrashAt(null);
    const amount = Math.floor(stake);
    if (!Number.isFinite(amount) || amount < 1) {
      setError("Минимальная ставка $1");
      setBusy(false);
      return;
    }
    if (amount > wallet) {
      setError("Ставка не может быть больше баланса");
      setBusy(false);
      return;
    }
    try {
      const bet = await miniappFetch<{
        id: number;
        created_at?: string;
        round: CrashState["round"];
      }>("/api/crash/bet", {
        method: "POST",
        body: JSON.stringify({ stake_usd: amount, idempotency_key: newIdempotencyKey() }),
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
      const msg = e instanceof Error ? e.message : "Cashout failed";
      setError(msg);
      if (msg.toLowerCase().includes("crash")) {
        setPhase("crashed");
        flightStartRef.current = null;
      }
      await load().catch(() => undefined);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const wallet = Math.max(0, Math.floor(user?.wallet_usd ?? 0));
  const potential = Math.floor((state?.active_bet?.stake_usd ?? stake) * mult);
  const quickBets = Array.from(
    new Set([
      ...[50, 100, 250, 500, 1000, 5000, 10_000, 25_000, 50_000].filter((v) => v <= wallet),
      ...(wallet > 0 ? [wallet] : []),
    ]),
  );

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
                "text-6xl font-black tracking-tight tabular-nums transition-colors sm:text-7xl",
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
              {phase === "crashed" && (crashAt != null ? `Краш на ${crashAt.toFixed(2)}x` : "Краш!")}
            </p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-[11px] tracking-wide text-mist-500 uppercase">Round</p>
            <p className="max-w-[9rem] truncate font-mono text-xs text-mist-300">{state?.round.public_id ?? "—"}</p>
          </div>
        </div>
        <canvas ref={canvasRef} className="relative mt-2 h-56 w-full sm:h-72" />
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
          {quickBets.slice(0, 8).map((value) => (
            <button
              key={value}
              type="button"
              disabled={Boolean(state?.active_bet) || value > wallet}
              onClick={() => setStake(value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                stake === value ? "bg-brand-500 text-white" : "bg-white/5 text-mist-300 hover:bg-white/10",
                value === wallet && wallet > 1000 && stake !== value && "border border-brand-400/40",
              )}
            >
              {value === wallet && wallet > 1000 ? `Всё · ${formatUsd(value)}` : formatUsd(value)}
            </button>
          ))}
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-mist-300">Ставка (лимит = баланс {formatUsd(wallet)})</span>
          <input
            type="number"
            min={1}
            max={Math.max(wallet, 1)}
            value={stake}
            onChange={(e) => {
              const next = Math.floor(Number(e.target.value));
              if (!Number.isFinite(next)) return;
              setStake(Math.max(1, Math.min(next, Math.max(wallet, 1))));
            }}
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
