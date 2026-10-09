"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  BANK_TERMS,
  BUSINESSES,
  CASES,
  CARS,
  CORP_BUILDINGS,
  CORP_TASKS,
  DONATE_PACKS,
  REALTY,
  RESOURCES,
  SHOP_ITEMS,
  VIP_LEVELS,
} from "@/lib/demo/lifestyle-catalog";
import {
  assetsSummary,
  buyBusiness,
  buyCar,
  buyRealty,
  buyShopItem,
  claimBankDeposit,
  collectBusiness,
  collectRealty,
  mineResources,
  openBankDeposit,
  openCase,
  sellBusiness,
  sellCar,
  sellRealty,
  sellResource,
  transferToBankAccount,
  upgradeBusiness,
  upgradeRealty,
  useLifestyle,
  withdrawBankAccount,
} from "@/lib/demo/lifestyle-state";
import { botUrl, env } from "@/lib/config/env";
import { useFormat } from "@/lib/hooks/use-format";
import { useNow } from "@/lib/hooks/use-now";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { usePlayer } from "@/lib/services/player-service";
import { openTelegramUrl } from "@/lib/telegram/webapp";
import { useDemoActionsAllowed } from "./demo-actions";
import { CityShell } from "./city-shell";

function useCityToast() {
  const { t, format } = useI18n();
  const fmt = useFormat();
  const toast = useToast();
  return {
    fail: (code: keyof typeof t.errors) => toast({ tone: "error" as const, title: t.errors[code] }),
    earned: (n: number) =>
      toast({ tone: "success" as const, title: format(t.city.earned, { n: fmt.usd(n) }), description: t.demo.claimDone }),
    refund: (n: number) =>
      toast({ tone: "success" as const, title: format(t.city.refund, { n: fmt.usd(n) }), description: t.demo.purchaseDone }),
    ok: (title: string) => toast({ tone: "success" as const, title, description: t.demo.purchaseDone }),
  };
}

export function BankScreen() {
  const { t, format } = useI18n();
  const fmt = useFormat();
  const life = useLifestyle();
  const now = useNow();
  const demo = useDemoActionsAllowed();
  const tip = useCityToast();
  const [amount, setAmount] = useState(10_000);
  const [days, setDays] = useState(30);

  return (
    <CityShell title={t.city.bank} subtitle={t.city.bankHint}>
      <Card className="space-y-3 p-4">
        <p className="text-[12px] text-mist-500">{t.city.bankAccount}</p>
        <p className="tabular text-2xl font-bold">{fmt.usd(life.bankAccountUsd)}</p>
        <div className="flex gap-2">
          <Button size="sm" disabled={!demo} onClick={() => { const r = transferToBankAccount(amount);
                  if (!r.ok) {
                    tip.fail(r.error.code);
                    return;
                  }
                  tip.ok(t.city.deposit); }}>
            {t.city.deposit} {fmt.usd(amount)}
          </Button>
          <Button size="sm" variant="secondary" disabled={!demo} onClick={() => { const r = withdrawBankAccount(Math.min(amount, life.bankAccountUsd));
                  if (!r.ok) {
                    tip.fail(r.error.code);
                    return;
                  }
                  tip.ok(t.city.withdraw); }}>
            {t.city.withdraw}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {[10_000, 50_000, 200_000, 1_000_000].map((value) => (
            <button key={value} type="button" onClick={() => setAmount(value)} className={`press rounded-full border px-3 py-1 text-[12px] ${amount === value ? "border-brand-400 bg-brand-500/15" : "border-white/10"}`}>
              {fmt.usd(value)}
            </button>
          ))}
        </div>
      </Card>

      <Section title={t.city.bankDeposits}>
        <div className="mb-3 flex flex-wrap gap-2">
          {BANK_TERMS.map((term) => (
            <button key={term.days} type="button" onClick={() => setDays(term.days)} className={`press rounded-full border px-3 py-1.5 text-[12px] ${days === term.days ? "border-brand-400 bg-brand-500/15" : "border-white/10"}`}>
              {format(t.city.bankTerm, { days: term.days, rate: term.ratePercent })}
            </button>
          ))}
        </div>
        <Button className="mb-3" disabled={!demo} onClick={() => { const r = openBankDeposit(amount, days);
                  if (!r.ok) {
                    tip.fail(r.error.code);
                    return;
                  }
                  tip.ok(t.city.deposit); }}>
          {t.city.deposit}
        </Button>
        {life.bankDeposits.filter((d) => !d.claimed).length === 0 ? (
          <p className="text-sm text-mist-500">{t.city.bankEmpty}</p>
        ) : (
          <div className="space-y-2">
            {life.bankDeposits.filter((d) => !d.claimed).map((deposit) => {
              const ready = Date.parse(deposit.endsAt) <= now;
              return (
                <Card key={deposit.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="tabular font-semibold">{fmt.usd(deposit.amountUsd)}</p>
                    <p className="text-[12px] text-mist-500">{format(t.city.bankTerm, { days: deposit.days, rate: deposit.ratePercent })}</p>
                  </div>
                  <Button size="sm" disabled={!demo || !ready} onClick={() => { const r = claimBankDeposit(deposit.id);
                  if (!r.ok) {
                    tip.fail(r.error.code);
                    return;
                  }
                  tip.earned(r.data.payout); }}>
                    {ready ? t.city.claim : t.city.cooldown}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </CityShell>
  );
}

export function ShopScreen() {
  const { t, locale } = useI18n();
  const fmt = useFormat();
  const demo = useDemoActionsAllowed();
  const tip = useCityToast();

  return (
    <CityShell title={t.city.shop} subtitle={t.city.shopHint}>
      <div className="space-y-2.5">
        {SHOP_ITEMS.map((item) => (
          <Card key={item.id} className="flex items-center gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{item.name[locale]}</p>
              <p className="text-[12px] text-mist-500">{item.description[locale]}</p>
              <p className="tabular mt-1 text-brand-200">{fmt.usd(item.priceUsd)}</p>
            </div>
            <Button size="sm" disabled={!demo} onClick={() => { const r = buyShopItem(item.id);
                  if (!r.ok) {
                    tip.fail(r.error.code);
                    return;
                  }
                  tip.ok(t.city.buy); }}>
              {t.city.buy}
            </Button>
          </Card>
        ))}
      </div>
    </CityShell>
  );
}

export function RealtyScreen() {
  const { t, locale, format } = useI18n();
  const fmt = useFormat();
  const life = useLifestyle();
  const demo = useDemoActionsAllowed();
  const tip = useCityToast();

  return (
    <CityShell title={t.city.realty} subtitle={t.city.realtyHint}>
      <div className="space-y-2.5">
        {REALTY.map((item) => {
          const owned = life.realty.find((entry) => entry.id === item.id);
          return (
            <Card key={item.id} className="space-y-3 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.name[locale]}</p>
                  <p className="tabular text-[13px] text-mist-300">
                    {fmt.usd(item.incomePerHour)}
                    {t.city.perHour}
                    {owned ? ` · ${format(t.city.level, { n: owned.level })}` : ""}
                  </p>
                  <p className="tabular mt-1 text-brand-200">{fmt.usd(item.priceUsd)}</p>
                </div>
                <span className="text-[11px] font-semibold tracking-wide text-mist-500 uppercase">{owned ? t.city.owned : t.city.available}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {!owned && (
                  <Button size="sm" disabled={!demo} onClick={() => { const r = buyRealty(item.id);
                  if (!r.ok) {
                    tip.fail(r.error.code);
                    return;
                  }
                  tip.ok(t.city.buy); }}>{t.city.buy}</Button>
                )}
                {owned && (
                  <>
                    <Button size="sm" disabled={!demo} onClick={() => { const r = collectRealty(item.id);
                  if (!r.ok) {
                    tip.fail(r.error.code);
                    return;
                  }
                  tip.earned(r.data.income); }}>{t.city.collect}</Button>
                    <Button size="sm" variant="secondary" disabled={!demo || owned.level >= item.maxLevel} onClick={() => { const r = upgradeRealty(item.id);
                  if (!r.ok) {
                    tip.fail(r.error.code);
                    return;
                  }
                  tip.ok(t.city.upgrade); }}>{t.city.upgrade}</Button>
                    <Button size="sm" variant="ghost" disabled={!demo} onClick={() => { const r = sellRealty(item.id);
                  if (!r.ok) {
                    tip.fail(r.error.code);
                    return;
                  }
                  tip.refund(r.data.refund); }}>{t.city.sell}</Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </CityShell>
  );
}

export function CarsScreen() {
  const { t, locale, format } = useI18n();
  const fmt = useFormat();
  const life = useLifestyle();
  const demo = useDemoActionsAllowed();
  const tip = useCityToast();

  return (
    <CityShell title={t.city.cars} subtitle={t.city.carsHint}>
      <div className="space-y-2.5">
        {CARS.map((item) => {
          const owned = life.cars.includes(item.id);
          return (
            <Card key={item.id} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.name[locale]}</p>
                <p className="text-[12px] text-mist-500">{item.brand} {item.model}</p>
                <p className="mt-1 text-[11.5px] text-mist-500">
                  {format(t.city.power, { n: item.power })} · {format(t.city.speed, { n: item.maxSpeed })} · {format(t.city.prestige, { n: item.prestige })}
                </p>
                <p className="tabular mt-1 text-brand-200">{fmt.usd(item.priceUsd)}</p>
              </div>
              {owned ? (
                <Button size="sm" variant="secondary" disabled={!demo} onClick={() => { const r = sellCar(item.id);
                  if (!r.ok) {
                    tip.fail(r.error.code);
                    return;
                  }
                  tip.refund(r.data.refund); }}>{t.city.sell}</Button>
              ) : (
                <Button size="sm" disabled={!demo} onClick={() => { const r = buyCar(item.id);
                  if (!r.ok) {
                    tip.fail(r.error.code);
                    return;
                  }
                  tip.ok(t.city.buy); }}>{t.city.buy}</Button>
              )}
            </Card>
          );
        })}
      </div>
    </CityShell>
  );
}

export function BusinessScreen() {
  const { t, locale, format } = useI18n();
  const fmt = useFormat();
  const life = useLifestyle();
  const demo = useDemoActionsAllowed();
  const tip = useCityToast();

  return (
    <CityShell title={t.city.business} subtitle={t.city.businessHint}>
      <div className="space-y-2.5">
        {BUSINESSES.map((item) => {
          const owned = life.businesses.find((entry) => entry.id === item.id);
          const net = item.incomePerHour - item.expensePerHour;
          return (
            <Card key={item.id} className="space-y-3 p-3.5">
              <div>
                <p className="font-semibold">{item.name[locale]}</p>
                <p className="tabular text-[13px] text-mist-300">
                  {fmt.usd(net)} {t.city.netHour}
                  {owned ? ` · ${format(t.city.level, { n: owned.level })}` : ""}
                </p>
                <p className="tabular mt-1 text-brand-200">{fmt.usd(item.priceUsd)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!owned && <Button size="sm" disabled={!demo} onClick={() => { const r = buyBusiness(item.id);
                  if (!r.ok) {
                    tip.fail(r.error.code);
                    return;
                  }
                  tip.ok(t.city.buy); }}>{t.city.buy}</Button>}
                {owned && (
                  <>
                    <Button size="sm" disabled={!demo} onClick={() => { const r = collectBusiness(item.id);
                  if (!r.ok) {
                    tip.fail(r.error.code);
                    return;
                  }
                  tip.earned(r.data.income); }}>{t.city.collect}</Button>
                    <Button size="sm" variant="secondary" disabled={!demo || owned.level >= item.maxLevel} onClick={() => { const r = upgradeBusiness(item.id);
                  if (!r.ok) {
                    tip.fail(r.error.code);
                    return;
                  }
                  tip.ok(t.city.upgrade); }}>{t.city.upgrade}</Button>
                    <Button size="sm" variant="ghost" disabled={!demo} onClick={() => { const r = sellBusiness(item.id);
                  if (!r.ok) {
                    tip.fail(r.error.code);
                    return;
                  }
                  tip.refund(r.data.refund); }}>{t.city.sell}</Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </CityShell>
  );
}

export function AssetsScreen() {
  const { t } = useI18n();
  const fmt = useFormat();
  const life = useLifestyle();
  const summary = assetsSummary(life);

  return (
    <CityShell title={t.city.assets} subtitle={t.city.assetsHint}>
      <Card className="p-4">
        <p className="text-[12px] text-mist-500">{t.city.assetsTotal}</p>
        <p className="tabular mt-1 text-3xl font-bold">{fmt.usd(summary.totalValue)}</p>
      </Card>
      <div className="grid grid-cols-3 gap-2.5">
        {[
          [t.city.assetsRealty, summary.realtyCount, summary.realtyValue],
          [t.city.assetsCars, summary.carsCount, summary.carValue],
          [t.city.assetsBiz, summary.businessesCount, summary.bizValue],
        ].map(([label, count, value]) => (
          <Card key={String(label)} className="p-3">
            <p className="text-[11px] text-mist-500">{label}</p>
            <p className="tabular mt-1 text-lg font-bold">{count}</p>
            <p className="tabular text-[12px] text-mist-300">{fmt.usd(Number(value))}</p>
          </Card>
        ))}
      </div>
    </CityShell>
  );
}

export function CasesScreen() {
  const { t, locale, format } = useI18n();
  const fmt = useFormat();
  const demo = useDemoActionsAllowed();
  const tip = useCityToast();

  return (
    <CityShell title={t.city.cases} subtitle={t.city.casesHint}>
      <div className="space-y-2.5">
        {CASES.map((item) => (
          <Card key={item.id} className="flex items-center gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{item.name[locale]}</p>
              <p className="text-[11px] uppercase tracking-wide text-mist-500">{item.rarity}</p>
              <p className="tabular mt-1 text-brand-200">{fmt.usd(item.priceUsd)}</p>
            </div>
            <Button
              size="sm"
              disabled={!demo}
              onClick={() => {
                const r = openCase(item.id);
                if (!r.ok) return tip.fail(r.error.code);
                tip.ok(format(t.city.caseReward, { name: r.data.reward.name[locale] }));
              }}
            >
              {t.city.open}
            </Button>
          </Card>
        ))}
      </div>
    </CityShell>
  );
}

export function ResourcesScreen() {
  const { t, locale } = useI18n();
  const fmt = useFormat();
  const life = useLifestyle();
  const demo = useDemoActionsAllowed();
  const tip = useCityToast();

  return (
    <CityShell title={t.city.resources} subtitle={t.city.resourcesHint}>
      <Button
        disabled={!demo}
        onClick={() => {
          const r = mineResources();
          if (!r.ok) return tip.fail(r.error.code);
          const text = Object.entries(r.data.drops)
            .map(([id, qty]) => `${RESOURCES.find((x) => x.id === id)?.name[locale] ?? id} ×${qty}`)
            .join(", ");
          tip.ok(text || t.city.drops);
        }}
      >
        {t.city.mine}
      </Button>
      <Section title={t.city.inventory}>
        <div className="space-y-2">
          {RESOURCES.map((resource) => (
            <Card key={resource.id} className="flex items-center justify-between gap-3 p-3">
              <div>
                <p className="font-semibold">{resource.name[locale]}</p>
                <p className="tabular text-[13px] text-mist-300">×{life.resources[resource.id] ?? 0}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={!demo || (life.resources[resource.id] ?? 0) < 1}
                onClick={() => {
                  const r = sellResource(resource.id, 1);
                  if (!r.ok) {
                    tip.fail(r.error.code);
                    return;
                  }
                  tip.earned(r.data.income);
                }}
              >
                {t.city.sellQty}
              </Button>
            </Card>
          ))}
        </div>
      </Section>
      <Section title={t.city.exchange}>
        <div className="space-y-1.5 text-[13px] text-mist-300">
          {RESOURCES.map((resource) => (
            <p key={resource.id} className="flex justify-between gap-3 border-b border-white/[0.05] py-2">
              <span>{resource.name[locale]}</span>
              <span className="tabular">{fmt.usd(resource.buyPrice)} / {fmt.usd(resource.sellPrice)}</span>
            </p>
          ))}
        </div>
      </Section>
    </CityShell>
  );
}

export function VipScreen() {
  const { t, format } = useI18n();
  return (
    <CityShell title={t.city.vip} subtitle={t.city.vipHint}>
      <Section title={t.city.vipLevels}>
        <div className="space-y-2">
          {VIP_LEVELS.map((level) => (
            <Card key={level.level} className="flex items-center justify-between p-3.5">
              <p className="font-semibold">VIP {level.level}</p>
              <p className="text-brand-200">{format(t.city.vipDaily, { n: level.dailyMultiplier })}</p>
            </Card>
          ))}
        </div>
      </Section>
    </CityShell>
  );
}

export function DonateScreen() {
  const { t, format } = useI18n();
  const fmt = useFormat();
  const url = botUrl();
  return (
    <CityShell title={t.city.donate} subtitle={t.city.donateHint}>
      <p className="text-[13px] text-mist-300">{t.city.donateNote}</p>
      <div className="space-y-2">
        {DONATE_PACKS.map((pack) => (
          <Card key={pack.stars} className="flex items-center justify-between p-3.5">
            <p className="font-semibold">{format(t.city.donatePack, { stars: pack.stars, usd: fmt.usd(pack.usd) })}</p>
            <Button size="sm" disabled={!url} onClick={() => url && openTelegramUrl(url)}>{t.games.openInBot}</Button>
          </Card>
        ))}
      </div>
    </CityShell>
  );
}

export function PromoScreen() {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  return (
    <CityShell title={t.city.promo} subtitle={t.city.promoHint}>
      <Card className="space-y-3 p-4">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder={t.city.promoPlaceholder}
          className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-brand-400/50"
        />
        <Button disabled>{t.city.promoSubmit}</Button>
        <p className="text-[12.5px] text-mist-500">{t.city.promoDemo}</p>
      </Card>
    </CityShell>
  );
}

export function ReferralsScreen() {
  const { t, format } = useI18n();
  const life = useLifestyle();
  const player = usePlayer();
  const link = env.botUsername
    ? `https://t.me/${env.botUsername}?start=ref_${player.data?.telegramId ?? "demo"}`
    : null;

  return (
    <CityShell title={t.city.referrals} subtitle={t.city.referralsHint}>
      <Card className="space-y-3 p-4">
        <p className="text-[12px] text-mist-500">{t.city.referralLink}</p>
        <p className="break-all text-sm font-medium text-brand-100">{link ?? "—"}</p>
        <p className="text-[13px] text-mist-300">{format(t.city.referralCount, { n: life.referralsCount })}</p>
        <p className="text-[12.5px] text-mist-500">{t.city.referralNote}</p>
      </Card>
    </CityShell>
  );
}

export function CorpScreen() {
  const { t, locale, format } = useI18n();
  const fmt = useFormat();
  const life = useLifestyle();

  return (
    <CityShell title={t.city.corp} subtitle={t.city.corpHint}>
      {!life.corporationName ? <p className="text-sm text-mist-300">{t.city.corpEmpty}</p> : null}
      <Section title={t.city.corpBuildings}>
        <div className="space-y-2">
          {CORP_BUILDINGS.map((item) => (
            <Card key={item.id} className="p-3.5">
              <p className="font-semibold">{item.name[locale]}</p>
              <p className="tabular mt-1 text-[13px] text-mist-300">
                {fmt.usd(item.priceUsd)} · +{item.prestigeBonus} · +{item.incomeBonusPercent}%
              </p>
            </Card>
          ))}
        </div>
      </Section>
      <Section title={t.city.corpTasks}>
        <div className="space-y-2">
          {CORP_TASKS.map((task) => (
            <Card key={task.id} className="p-3.5">
              <p className="font-semibold">{task.name[locale]}</p>
              <p className="mt-0.5 text-[12.5px] text-mist-500">{task.description[locale]}</p>
              <p className="tabular mt-2 text-brand-200">{fmt.usd(task.rewardUsd)} · {format(t.city.prestige, { n: task.prestigeReward })}</p>
            </Card>
          ))}
        </div>
      </Section>
    </CityShell>
  );
}

export function MarriageScreen() {
  const { t, format } = useI18n();
  const life = useLifestyle();
  return (
    <CityShell title={t.city.marriage} subtitle={t.city.marriageHint}>
      <Card className="p-4 text-sm text-mist-300">
        {life.marriagePartner ? format(t.city.marriageStatus, { name: life.marriagePartner }) : t.city.marriageEmpty}
      </Card>
    </CityShell>
  );
}

export function EventsScreen() {
  const { t } = useI18n();
  return (
    <CityShell title={t.city.events} subtitle={t.city.eventsHint}>
      <Card className="p-4 text-sm leading-relaxed text-mist-300">{t.city.eventsText}</Card>
    </CityShell>
  );
}

export function HelpScreen() {
  const { t } = useI18n();
  return (
    <CityShell title={t.city.help} subtitle={t.city.helpHint}>
      <Card className="p-4 text-sm leading-relaxed text-mist-300">{t.city.helpText}</Card>
    </CityShell>
  );
}
