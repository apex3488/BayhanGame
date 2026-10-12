"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { miniappFetch, newIdempotencyKey } from "@/lib/api/miniapp-client";
import { useAuth } from "@/lib/auth/auth-provider";

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
  } | null;
  history: Array<{ public_id: string; crash_multiplier: number }>;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function CrashScreen() {
  const { user, refresh } = useAuth();
  const [state, setState] = useState<CrashState | null>(null);
  const [stake, setStake] = useState(100);
  const [mult, setMult] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await miniappFetch<CrashState>("/api/crash/state");
    setState(data);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((e: Error) => setError(e.message));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const running =
    Boolean(state?.round.started_at) && state?.round.status === "running" && Boolean(state.active_bet);
  const startedAt = state?.round.started_at ? Date.parse(state.round.started_at) : 0;

  useEffect(() => {
    if (!running || !startedAt) return;
    const id = window.setInterval(() => {
      const elapsed = Math.max(0, (Date.now() - startedAt) / 1000);
      setMult(Number((1 + elapsed * 0.15).toFixed(2)));
    }, 50);
    return () => window.clearInterval(id);
  }, [running, startedAt]);

  async function placeBet() {
    setBusy(true);
    setError(null);
    try {
      await miniappFetch("/api/crash/bet", {
        method: "POST",
        body: JSON.stringify({ stake_usd: stake, idempotency_key: newIdempotencyKey() }),
      });
      await Promise.all([load(), refresh()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bet failed");
    } finally {
      setBusy(false);
    }
  }

  async function cashout() {
    if (!state?.active_bet) return;
    setBusy(true);
    setError(null);
    try {
      await miniappFetch("/api/crash/cashout", {
        method: "POST",
        body: JSON.stringify({
          bet_id: state.active_bet.id,
          displayed_multiplier: mult,
          idempotency_key: newIdempotencyKey(),
        }),
      });
      await Promise.all([load(), refresh()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cashout failed");
    } finally {
      setBusy(false);
    }
  }

  const potential = Math.floor(stake * mult);

  return (
    <div className="space-y-5">
      <PageHeader title="Crash" subtitle="Серверный коэффициент · cash out до краша" />
      <Card className="relative overflow-hidden border-brand-400/20 bg-gradient-to-b from-[#0B1220] to-[#05070B] p-5">
        <div className="pointer-events-none absolute -top-20 right-0 size-56 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.2em] text-mist-400 uppercase">Multiplier</p>
            <p className="mt-1 text-5xl font-bold tracking-tight text-white tabular-nums">{mult.toFixed(2)}x</p>
            <p className="mt-2 text-sm text-mist-300">
              Баланс: <span className="font-semibold text-white">{formatUsd(user?.wallet_usd ?? 0)}</span>
            </p>
          </div>
          <div className="text-right text-xs text-mist-500">
            <p>Round</p>
            <p className="max-w-[10rem] truncate font-mono text-mist-300">{state?.round.public_id ?? "—"}</p>
          </div>
        </div>
        <div className="relative mt-6 h-28 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <div
            className="absolute bottom-0 left-0 h-1 rounded-full bg-gradient-to-r from-brand-400 to-white transition-all duration-75"
            style={{ width: `${Math.min(96, (mult - 1) * 18)}%` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-size-[100%_18px]" />
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <label className="block text-sm">
          <span className="mb-1 block text-mist-300">Ставка (USD)</span>
          <input
            type="number"
            min={1}
            max={10000}
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none focus:border-brand-400"
            disabled={Boolean(state?.active_bet)}
          />
        </label>
        <p className="text-sm text-mist-300">
          Потенциал: <span className="font-semibold text-white">{formatUsd(potential)}</span>
        </p>
        {error && <p className="text-sm text-red-300">{error}</p>}
        {!state?.active_bet ? (
          <Button block loading={busy} onClick={placeBet}>
            Поставить
          </Button>
        ) : (
          <Button block loading={busy} onClick={cashout}>
            Забрать {formatUsd(Math.floor(state.active_bet.stake_usd * mult))}
          </Button>
        )}
      </Card>

      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold text-white">Последние раунды</p>
        <div className="flex flex-wrap gap-2">
          {(state?.history ?? []).map((item) => (
            <span
              key={item.public_id}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                item.crash_multiplier >= 2 ? "bg-brand-500/20 text-brand-100" : "bg-white/5 text-mist-300"
              }`}
            >
              {item.crash_multiplier.toFixed(2)}x
            </span>
          ))}
          {!state?.history?.length && <span className="text-sm text-mist-500">Пока пусто</span>}
        </div>
      </Card>
    </div>
  );
}
