"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { miniappFetch, newIdempotencyKey } from "@/lib/api/miniapp-client";
import { useAuth } from "@/lib/auth/auth-provider";

interface Dashboard {
  players: number;
  wallet_sum_usd: number;
  bank_sum_usd: number;
  crash_rounds: number;
  promo_codes: number;
}

interface PlayerRow {
  id: number;
  login: string;
  display_name: string;
  wallet_usd: number;
  bank_usd: number;
  is_banned: boolean;
}

export function AdminScreen() {
  const { user } = useAuth();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [promoCode, setPromoCode] = useState("BONUS500");
  const [promoUsd, setPromoUsd] = useState(500);
  const [adjustUserId, setAdjustUserId] = useState(0);
  const [adjustAmount, setAdjustAmount] = useState(100);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    const [d, p] = await Promise.all([
      miniappFetch<Dashboard>("/api/admin/dashboard"),
      miniappFetch<PlayerRow[]>("/api/admin/players"),
    ]);
    setDash(d);
    setPlayers(p);
  }

  useEffect(() => {
    if (!user?.is_admin) return;
    const timer = window.setTimeout(() => {
      void reload().catch((e: Error) => setMessage(e.message));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user?.is_admin]);

  if (!user?.is_admin) {
    return (
      <Card className="p-6 text-center">
        <p className="font-semibold text-white">Доступ только для администратора</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Admin" subtitle="Управление Mini App (не связано с Telegram-ботом)" />
      {message && <p className="text-sm text-brand-200">{message}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Игроки", dash?.players],
          ["Кошельки", dash?.wallet_sum_usd],
          ["Банк", dash?.bank_sum_usd],
          ["Crash", dash?.crash_rounds],
          ["Промо", dash?.promo_codes],
        ].map(([label, value]) => (
          <Card key={String(label)} className="p-4">
            <p className="text-xs text-mist-400 uppercase tracking-wide">{label}</p>
            <p className="mt-2 text-2xl font-bold text-white tabular-nums">{value ?? "—"}</p>
          </Card>
        ))}
      </div>

      <Card className="space-y-3 p-4">
        <p className="font-semibold text-white">Промокод</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} />
          <input type="number" className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white" value={promoUsd} onChange={(e) => setPromoUsd(Number(e.target.value))} />
          <Button
            onClick={async () => {
              await miniappFetch("/api/admin/promos", {
                method: "POST",
                body: JSON.stringify({
                  code: promoCode,
                  reward_type: "usd",
                  reward_usd: promoUsd,
                  description: "Admin promo",
                }),
              });
              setMessage(`Промо ${promoCode} создан`);
              await reload();
            }}
          >
            Создать
          </Button>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <p className="font-semibold text-white">Баланс</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input type="number" className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white" placeholder="User ID" value={adjustUserId || ""} onChange={(e) => setAdjustUserId(Number(e.target.value))} />
          <input type="number" className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white" value={adjustAmount} onChange={(e) => setAdjustAmount(Number(e.target.value))} />
          <Button
            onClick={async () => {
              await miniappFetch("/api/admin/balance/adjust", {
                method: "POST",
                body: JSON.stringify({
                  user_id: adjustUserId,
                  amount_usd: adjustAmount,
                  reason: "Admin adjustment",
                  idempotency_key: newIdempotencyKey(),
                }),
              });
              setMessage("Баланс обновлён");
              await reload();
            }}
          >
            Применить
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <p className="mb-3 font-semibold text-white">Игроки</p>
        <div className="space-y-2">
          {players.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 px-3 py-2 text-sm">
              <span className="text-white">#{p.id} {p.login}</span>
              <span className="text-mist-300">${p.wallet_usd} / bank ${p.bank_usd}</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await miniappFetch(`/api/admin/players/${p.id}/${p.is_banned ? "unban" : "ban"}`, {
                    method: "POST",
                    body: p.is_banned ? undefined : JSON.stringify({ reason: "policy" }),
                  });
                  await reload();
                }}
              >
                {p.is_banned ? "Unban" : "Ban"}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
