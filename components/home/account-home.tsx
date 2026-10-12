"use client";

import Link from "next/link";
import { ArrowLeftRight, Landmark, Rocket, Ticket, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { miniappFetch, newIdempotencyKey } from "@/lib/api/miniapp-client";
import { useAuth } from "@/lib/auth/auth-provider";
import { useEffect, useState } from "react";

function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

interface Tx {
  id: number;
  type: string;
  amount_usd: number;
  reason: string;
  created_at: string;
}

export function AccountHome() {
  const { user, refresh, logout } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [promo, setPromo] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [amount, setAmount] = useState(1000);

  useEffect(() => {
    void miniappFetch<Tx[]>("/api/economy/transactions?limit=8")
      .then(setTxs)
      .catch(() => setTxs([]));
  }, [user?.wallet_usd, user?.bank_usd]);

  if (!user) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Привет, ${user.display_name}`}
        subtitle={`@${user.login} · уровень ${user.level}`}
        actions={
          <Button size="sm" variant="secondary" onClick={logout}>
            Выход
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="overflow-hidden border-brand-400/20 p-5">
          <div className="flex items-center gap-2 text-mist-300">
            <Wallet className="size-4 text-brand-300" /> Кошелёк
          </div>
          <p className="mt-2 text-4xl font-bold tracking-tight text-white">{money(user.wallet_usd)}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-mist-300">
            <Landmark className="size-4 text-brand-300" /> Банк
          </div>
          <p className="mt-2 text-4xl font-bold tracking-tight text-white">{money(user.bank_usd)}</p>
        </Card>
      </div>

      <Card className="relative overflow-hidden border-brand-400/30 p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(59,130,246,0.25),transparent_40%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.18em] text-brand-200 uppercase">Featured</p>
            <h2 className="mt-1 text-2xl font-bold text-white">Crash</h2>
            <p className="mt-1 text-sm text-mist-300">Ставьте, следите за множителем и забирайте вовремя.</p>
          </div>
          <ButtonLink href="/games/crash" icon={<Rocket className="size-4" />}>
            Играть
          </ButtonLink>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <p className="font-semibold text-white">Банковский перевод</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="min-w-[8rem] flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
          />
          <Button
            variant="secondary"
            icon={<ArrowLeftRight className="size-4" />}
            onClick={async () => {
              await miniappFetch("/api/economy/transfer", {
                method: "POST",
                body: JSON.stringify({
                  amount_usd: amount,
                  direction: "to_bank",
                  idempotency_key: newIdempotencyKey(),
                }),
              });
              await refresh();
              setMsg("Переведено в банк");
            }}
          >
            В банк
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              await miniappFetch("/api/economy/transfer", {
                method: "POST",
                body: JSON.stringify({
                  amount_usd: amount,
                  direction: "to_wallet",
                  idempotency_key: newIdempotencyKey(),
                }),
              });
              await refresh();
              setMsg("Переведено в кошелёк");
            }}
          >
            В кошелёк
          </Button>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <p className="font-semibold text-white">Промокод</p>
        <div className="flex gap-2">
          <input
            value={promo}
            onChange={(e) => setPromo(e.target.value)}
            placeholder="CODE"
            className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 uppercase text-white"
          />
          <Button
            icon={<Ticket className="size-4" />}
            onClick={async () => {
              try {
                await miniappFetch("/api/promos/redeem", {
                  method: "POST",
                  body: JSON.stringify({ code: promo, idempotency_key: newIdempotencyKey() }),
                });
                await refresh();
                setMsg("Промокод активирован");
              } catch (e) {
                setMsg(e instanceof Error ? e.message : "Ошибка промокода");
              }
            }}
          >
            Активировать
          </Button>
        </div>
        {msg && <p className="text-sm text-brand-200">{msg}</p>}
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold text-white">Последние операции</p>
          {user.is_admin && (
            <Link href="/admin" className="text-sm text-brand-300 hover:text-white">
              Админка
            </Link>
          )}
        </div>
        <div className="space-y-2">
          {txs.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="text-white">{tx.reason}</p>
                <p className="text-xs text-mist-500">{tx.type}</p>
              </div>
              <p className={`font-semibold tabular-nums ${tx.amount_usd >= 0 ? "text-brand-200" : "text-mist-200"}`}>
                {tx.amount_usd >= 0 ? "+" : ""}
                {money(tx.amount_usd)}
              </p>
            </div>
          ))}
          {!txs.length && <p className="text-sm text-mist-500">Операций пока нет</p>}
        </div>
      </Card>
    </div>
  );
}
