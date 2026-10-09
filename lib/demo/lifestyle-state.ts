"use client";

import { useSyncExternalStore } from "react";
import { fail, ok, type ApiResult } from "@/lib/api/result";
import { randomFloat } from "@/lib/games/rng";
import { patchPlayer } from "@/lib/services/player-service";
import type { CaseRewardDef, LifestyleSnapshot } from "@/types/lifestyle";
import {
  BANK_TERMS,
  BUSINESSES,
  CASES,
  CARS,
  JOBS,
  MINING_COOLDOWN_SEC,
  REALTY,
  RESOURCES,
  SELL_RATIO,
  SHOP_ITEMS,
} from "./lifestyle-catalog";
import { assertDemoSandbox } from "./sandbox-gate";

function randomBetween(min: number, max: number): number {
  return Math.floor(min + randomFloat() * (max - min + 1));
}

function requireDemo<T>(): ApiResult<T> | null {
  if (assertDemoSandbox()) return null;
  return fail("not_configured", "City mutations require explicit demo mode");
}

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function initial(): LifestyleSnapshot {
  const now = Date.now();
  return {
    jobsCooldownUntil: {},
    realty: [{ id: "studio", level: 2, lastCollectAt: new Date(now - 2 * 3_600_000).toISOString() }],
    cars: ["sedan"],
    businesses: [{ id: "coffee_shop", level: 1, lastCollectAt: new Date(now - 45 * 60_000).toISOString() }],
    resources: { wood: 12, stone: 8, iron: 3, diamond: 0, energy: 5 },
    bankDeposits: [],
    bankAccountUsd: 25_000,
    vipLevel: null,
    vipExpiresAt: null,
    referralsCount: 2,
    marriagePartner: null,
    corporationName: null,
    lastMineAt: null,
    activeJobId: null,
  };
}

let state = initial();

export function getLifestyleSnapshot(): LifestyleSnapshot {
  return state;
}

export function subscribeLifestyle(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLifestyle(): LifestyleSnapshot {
  return useSyncExternalStore(subscribeLifestyle, getLifestyleSnapshot, initial);
}

function spend(amount: number): ApiResult<null> {
  if (!assertDemoSandbox()) return fail("not_configured", "demo_sandbox_disabled");
  let okSpend = false;
  patchPlayer((player) => {
    if (player.usdBalance < amount) return player;
    okSpend = true;
    return { ...player, usdBalance: player.usdBalance - amount };
  });
  return okSpend ? ok(null) : fail("insufficient_funds");
}

function credit(usd = 0, btc = 0) {
  if (!assertDemoSandbox() || (usd === 0 && btc === 0)) return;
  patchPlayer((player) => ({
    ...player,
    usdBalance: player.usdBalance + usd,
    btcBalance: player.btcBalance + btc,
  }));
}

function capitalOf(): number {
  let capital = 0;
  patchPlayer((player) => {
    capital = player.usdBalance + (player.bankUsd ?? 0);
    return player;
  });
  return capital;
}

export function workJob(jobId: string): ApiResult<{ income: number }> {
  const blocked = requireDemo<{ income: number }>();
  if (blocked) return blocked;
  const job = JOBS.find((item) => item.id === jobId);
  if (!job) return fail("not_found");
  const until = state.jobsCooldownUntil[jobId];
  if (until && Date.parse(until) > Date.now()) return fail("cooldown");
  if (job.requireCar && state.cars.length === 0) return fail("not_owned", "car_required");
  if (capitalOf() < job.minCapitalUsd) return fail("insufficient_funds", "capital");
  const income = randomBetween(job.incomeMin, job.incomeMax);
  credit(income);
  state = {
    ...state,
    activeJobId: jobId,
    jobsCooldownUntil: { ...state.jobsCooldownUntil, [jobId]: new Date(Date.now() + job.cooldownSec * 1000).toISOString() },
  };
  notify();
  return ok({ income });
}

export function buyRealty(id: string): ApiResult<null> {
  const item = REALTY.find((entry) => entry.id === id);
  if (!item) return fail("not_found");
  if (state.realty.some((owned) => owned.id === id)) return fail("already_owned");
  const spent = spend(item.priceUsd);
  if (!spent.ok) return spent;
  state = { ...state, realty: [...state.realty, { id, level: 1, lastCollectAt: new Date().toISOString() }] };
  notify();
  return ok(null);
}

export function upgradeRealty(id: string): ApiResult<null> {
  const def = REALTY.find((entry) => entry.id === id);
  const owned = state.realty.find((entry) => entry.id === id);
  if (!def || !owned) return fail("not_owned");
  if (owned.level >= def.maxLevel) return fail("unknown", "max_level");
  const cost = def.upgradeCostBase * owned.level;
  const spent = spend(cost);
  if (!spent.ok) return spent;
  state = {
    ...state,
    realty: state.realty.map((entry) => (entry.id === id ? { ...entry, level: entry.level + 1 } : entry)),
  };
  notify();
  return ok(null);
}

export function collectRealty(id: string): ApiResult<{ income: number }> {
  const def = REALTY.find((entry) => entry.id === id);
  const owned = state.realty.find((entry) => entry.id === id);
  if (!def || !owned) return fail("not_owned");
  const last = owned.lastCollectAt ? Date.parse(owned.lastCollectAt) : Date.now();
  const hours = Math.max(0, (Date.now() - last) / 3_600_000);
  const income = Math.floor(def.incomePerHour * owned.level * hours);
  if (income <= 0) return fail("cooldown");
  credit(income);
  state = {
    ...state,
    realty: state.realty.map((entry) => (entry.id === id ? { ...entry, lastCollectAt: new Date().toISOString() } : entry)),
  };
  notify();
  return ok({ income });
}

export function sellRealty(id: string): ApiResult<{ refund: number }> {
  const def = REALTY.find((entry) => entry.id === id);
  const owned = state.realty.find((entry) => entry.id === id);
  if (!def || !owned) return fail("not_owned");
  const refund = Math.floor(def.priceUsd * SELL_RATIO);
  credit(refund);
  state = { ...state, realty: state.realty.filter((entry) => entry.id !== id) };
  notify();
  return ok({ refund });
}

export function buyCar(id: string): ApiResult<null> {
  const item = CARS.find((entry) => entry.id === id);
  if (!item) return fail("not_found");
  if (state.cars.includes(id)) return fail("already_owned");
  const spent = spend(item.priceUsd);
  if (!spent.ok) return spent;
  state = { ...state, cars: [...state.cars, id] };
  notify();
  return ok(null);
}

export function sellCar(id: string): ApiResult<{ refund: number }> {
  const item = CARS.find((entry) => entry.id === id);
  if (!item || !state.cars.includes(id)) return fail("not_owned");
  const refund = Math.floor(item.priceUsd * SELL_RATIO);
  credit(refund);
  state = { ...state, cars: state.cars.filter((code) => code !== id) };
  notify();
  return ok({ refund });
}

export function buyBusiness(id: string): ApiResult<null> {
  const item = BUSINESSES.find((entry) => entry.id === id);
  if (!item) return fail("not_found");
  if (state.businesses.some((owned) => owned.id === id)) return fail("already_owned");
  const spent = spend(item.priceUsd);
  if (!spent.ok) return spent;
  state = { ...state, businesses: [...state.businesses, { id, level: 1, lastCollectAt: new Date().toISOString() }] };
  notify();
  return ok(null);
}

export function upgradeBusiness(id: string): ApiResult<null> {
  const def = BUSINESSES.find((entry) => entry.id === id);
  const owned = state.businesses.find((entry) => entry.id === id);
  if (!def || !owned) return fail("not_owned");
  if (owned.level >= def.maxLevel) return fail("unknown", "max_level");
  const cost = def.upgradeCostBase * owned.level;
  const spent = spend(cost);
  if (!spent.ok) return spent;
  state = {
    ...state,
    businesses: state.businesses.map((entry) => (entry.id === id ? { ...entry, level: entry.level + 1 } : entry)),
  };
  notify();
  return ok(null);
}

export function collectBusiness(id: string): ApiResult<{ income: number }> {
  const def = BUSINESSES.find((entry) => entry.id === id);
  const owned = state.businesses.find((entry) => entry.id === id);
  if (!def || !owned) return fail("not_owned");
  const last = owned.lastCollectAt ? Date.parse(owned.lastCollectAt) : Date.now();
  const hours = Math.max(0, (Date.now() - last) / 3_600_000);
  const net = Math.floor((def.incomePerHour - def.expensePerHour) * owned.level * hours);
  if (net <= 0) return fail("cooldown");
  credit(net);
  state = {
    ...state,
    businesses: state.businesses.map((entry) => (entry.id === id ? { ...entry, lastCollectAt: new Date().toISOString() } : entry)),
  };
  notify();
  return ok({ income: net });
}

export function sellBusiness(id: string): ApiResult<{ refund: number }> {
  const def = BUSINESSES.find((entry) => entry.id === id);
  if (!def || !state.businesses.some((owned) => owned.id === id)) return fail("not_owned");
  const refund = Math.floor(def.priceUsd * SELL_RATIO);
  credit(refund);
  state = { ...state, businesses: state.businesses.filter((owned) => owned.id !== id) };
  notify();
  return ok({ refund });
}

export function openCase(id: string): ApiResult<{ reward: CaseRewardDef }> {
  const item = CASES.find((entry) => entry.id === id);
  if (!item) return fail("not_found");
  const spent = spend(item.priceUsd);
  if (!spent.ok) return spent;
  const total = item.rewards.reduce((sum, reward) => sum + reward.weight, 0);
  let roll = randomBetween(1, total);
  let reward = item.rewards[item.rewards.length - 1]!;
  for (const entry of item.rewards) {
    roll -= entry.weight;
    if (roll <= 0) {
      reward = entry;
      break;
    }
  }
  if (reward.kind === "usd") credit(reward.amount);
  else if (reward.kind === "btc") credit(0, reward.amount);
  else if (reward.resourceCode) {
    state = {
      ...state,
      resources: { ...state.resources, [reward.resourceCode]: (state.resources[reward.resourceCode] ?? 0) + reward.amount },
    };
  }
  notify();
  return ok({ reward });
}

export function buyShopItem(id: string): ApiResult<null> {
  const item = SHOP_ITEMS.find((entry) => entry.id === id);
  if (!item) return fail("not_found");
  const spent = spend(item.priceUsd);
  if (!spent.ok) return spent;
  if (item.resourceCode && item.resourceAmount) {
    state = {
      ...state,
      resources: { ...state.resources, [item.resourceCode]: (state.resources[item.resourceCode] ?? 0) + item.resourceAmount },
    };
  }
  notify();
  return ok(null);
}

export function sellResource(id: string, qty: number): ApiResult<{ income: number }> {
  const item = RESOURCES.find((entry) => entry.id === id);
  const have = state.resources[id] ?? 0;
  if (!item || qty <= 0 || have < qty) return fail("not_owned");
  const income = item.sellPrice * qty;
  credit(income);
  state = { ...state, resources: { ...state.resources, [id]: have - qty } };
  notify();
  return ok({ income });
}

export function mineResources(): ApiResult<{ drops: Record<string, number> }> {
  const blocked = requireDemo<{ drops: Record<string, number> }>();
  if (blocked) return blocked;
  if (state.lastMineAt && Date.now() - Date.parse(state.lastMineAt) < MINING_COOLDOWN_SEC * 1000) {
    return fail("cooldown");
  }
  const drops: Record<string, number> = {};
  const next = { ...state.resources };
  for (const resource of RESOURCES) {
    if (randomBetween(1, 100) > resource.mineChance) continue;
    const amount = randomBetween(resource.mineMin, resource.mineMax);
    next[resource.id] = (next[resource.id] ?? 0) + amount;
    drops[resource.id] = amount;
  }
  state = { ...state, resources: next, lastMineAt: new Date().toISOString() };
  notify();
  return ok({ drops });
}

export function openBankDeposit(amount: number, days: number): ApiResult<null> {
  const term = BANK_TERMS.find((entry) => entry.days === days);
  if (!term || amount <= 0) return fail("unknown");
  const spent = spend(amount);
  if (!spent.ok) return spent;
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + days * 86_400_000);
  state = {
    ...state,
    bankDeposits: [
      ...state.bankDeposits,
      {
        id: `dep_${startsAt.getTime()}`,
        amountUsd: amount,
        days,
        ratePercent: term.ratePercent,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        claimed: false,
      },
    ],
  };
  notify();
  return ok(null);
}

export function claimBankDeposit(id: string): ApiResult<{ payout: number }> {
  const deposit = state.bankDeposits.find((entry) => entry.id === id);
  if (!deposit || deposit.claimed) return fail("already_claimed");
  if (Date.parse(deposit.endsAt) > Date.now()) return fail("cooldown");
  const payout = Math.floor(deposit.amountUsd * (1 + deposit.ratePercent / 100));
  credit(payout);
  state = {
    ...state,
    bankDeposits: state.bankDeposits.map((entry) => (entry.id === id ? { ...entry, claimed: true } : entry)),
  };
  notify();
  return ok({ payout });
}

export function transferToBankAccount(amount: number): ApiResult<null> {
  if (amount <= 0) return fail("unknown");
  const spent = spend(amount);
  if (!spent.ok) return spent;
  state = { ...state, bankAccountUsd: state.bankAccountUsd + amount };
  notify();
  return ok(null);
}

export function withdrawBankAccount(amount: number): ApiResult<null> {
  if (amount <= 0 || state.bankAccountUsd < amount) return fail("insufficient_funds");
  state = { ...state, bankAccountUsd: state.bankAccountUsd - amount };
  credit(amount);
  notify();
  return ok(null);
}

export function assetsSummary(snapshot: LifestyleSnapshot = state) {
  const realtyValue = snapshot.realty.reduce((sum, owned) => {
    const def = REALTY.find((entry) => entry.id === owned.id);
    return sum + (def?.priceUsd ?? 0);
  }, 0);
  const carValue = snapshot.cars.reduce((sum, id) => {
    const def = CARS.find((entry) => entry.id === id);
    return sum + (def?.priceUsd ?? 0);
  }, 0);
  const bizValue = snapshot.businesses.reduce((sum, owned) => {
    const def = BUSINESSES.find((entry) => entry.id === owned.id);
    return sum + (def?.priceUsd ?? 0);
  }, 0);
  return {
    realtyCount: snapshot.realty.length,
    carsCount: snapshot.cars.length,
    businessesCount: snapshot.businesses.length,
    realtyValue,
    carValue,
    bizValue,
    totalValue: realtyValue + carValue + bizValue,
  };
}
