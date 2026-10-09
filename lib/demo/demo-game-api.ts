import type { GameApi } from "@/lib/api/game-api";
import { fail, ok, type ApiResult } from "@/lib/api/result";
import type { TelegramWebAppUser } from "@/lib/telegram/types";
import type {
  EquipSlot,
  GameTask,
  InventoryEntry,
  LeaderboardCategory,
  Locale,
  Player,
  StoreItem,
  Transaction,
  TransactionType,
} from "@/types/game";
import { buildDemoActivity } from "./activity";
import { DEMO_CATALOG, type DemoStoreItem } from "./catalog";
import { buildDemoLeaderboard } from "./leaderboard";
import { DEMO_TASKS, type DemoTask } from "./tasks";

const DAY = 86_400_000;
const DEMO_BTC_RATE = 65_967;

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 220 + Math.random() * 260));

function localizeItem(item: DemoStoreItem, locale: Locale): StoreItem {
  return {
    id: item.id,
    category: item.category,
    name: item.name[locale],
    description: item.description[locale],
    rarity: item.rarity,
    priceUsd: item.priceUsd,
    purchasable: item.purchasable,
    isLimited: item.limitedQuantity !== null,
    limitedQuantity: item.limitedQuantity,
    soldCount: item.soldCount,
    featured: item.featured,
    preview: item.preview,
  };
}

function localizeTask(task: DemoTask, locale: Locale): GameTask {
  return {
    id: task.id,
    period: task.period,
    icon: task.icon,
    title: task.title[locale],
    description: task.description[locale],
    target: task.target,
    progress: Math.min(task.progress, task.target),
    rewardUsd: task.rewardUsd,
    rewardXp: task.rewardXp,
    status: task.claimed ? "claimed" : task.progress >= task.target ? "completed" : "in_progress",
  };
}

/**
 * In-memory sandbox implementing the full GameApi contract.
 * Nothing is persisted or sent anywhere: a reload restores the initial demo state.
 */
export function createDemoGameApi(user: TelegramWebAppUser | null): GameApi {
  const now = Date.now();
  const catalog = DEMO_CATALOG.map((item) => ({ ...item }));
  const tasks = DEMO_TASKS.map((task) => ({ ...task }));
  let activity: Transaction[] = buildDemoActivity(now);
  let txCounter = 0;

  const inventory: InventoryEntry[] = [
    { itemId: "frame_neon", acquiredAt: new Date(now - 20 * 3_600_000).toISOString(), serialNo: null, source: "purchase" },
    { itemId: "badge_high_roller", acquiredAt: new Date(now - 9 * DAY).toISOString(), serialNo: null, source: "purchase" },
    { itemId: "theme_cyberpunk", acquiredAt: new Date(now - 14 * DAY).toISOString(), serialNo: null, source: "purchase" },
    { itemId: "ns_brackets", acquiredAt: new Date(now - 30 * DAY).toISOString(), serialNo: null, source: "reward" },
  ];

  const player: Player = {
    telegramId: user?.id ?? null,
    nickname: user?.first_name?.trim() || "BAYHAN Player",
    username: user?.username ?? null,
    photoUrl: user?.photo_url ?? null,
    level: 14,
    xp: 2_340,
    xpForNextLevel: 3_000,
    usdBalance: 284_350,
    btcBalance: 0.0125,
    bankUsd: 120_000,
    dailyChangeUsd: 6_400,
    registeredAt: new Date(now - 46 * DAY).toISOString(),
    dailyStreak: 3,
    nextDailyAt: null,
    stats: {
      gamesPlayed: 148,
      gamesWon: 67,
      gamesLost: 81,
      totalWagered: 412_000,
      totalWon: 398_500,
      achievementsUnlocked: 7,
      achievementsTotal: 24,
    },
    loadout: { frame: "frame_neon", badge: "badge_high_roller", theme: "theme_cyberpunk", name_style: "ns_brackets", avatar_effect: null },
  };

  const snapshot = (): Player => ({ ...player, stats: { ...player.stats }, loadout: { ...player.loadout } });

  function record(type: TransactionType, amount: number, context: string | null) {
    txCounter += 1;
    activity = [
      { id: `demo-live-${txCounter}`, type, currency: "USD", amount, createdAt: new Date().toISOString(), context },
      ...activity,
    ];
  }

  function addXp(amount: number) {
    player.xp += amount;
    while (player.xpForNextLevel !== null && player.xp >= player.xpForNextLevel) {
      player.xp -= player.xpForNextLevel;
      player.level += 1;
      player.xpForNextLevel = Math.round(player.xpForNextLevel * 1.15);
    }
  }

  const leaderboardValue = (category: LeaderboardCategory) =>
    category === "capital"
      ? Math.round(player.usdBalance + player.btcBalance * DEMO_BTC_RATE)
      : category === "level"
        ? player.level
        : player.stats.gamesWon;

  return {
    kind: "demo",

    async getPlayer() {
      await wait();
      return ok(snapshot());
    },

    async getActivity(_locale, limit) {
      await wait();
      return ok(activity.slice(0, limit));
    },

    async claimDailyReward() {
      await wait();
      if (player.nextDailyAt && new Date(player.nextDailyAt).getTime() > Date.now()) return fail("cooldown");
      const reward = 500 + 100 * Math.min(player.dailyStreak, 6);
      player.dailyStreak += 1;
      player.usdBalance += reward;
      player.dailyChangeUsd = (player.dailyChangeUsd ?? 0) + reward;
      player.nextDailyAt = new Date(Date.now() + DAY).toISOString();
      record("DAILY_REWARD", reward, null);
      return ok({ rewardUsd: reward, streak: player.dailyStreak, nextDailyAt: player.nextDailyAt, balanceUsd: player.usdBalance });
    },

    async getStoreCatalog(locale) {
      await wait();
      return ok(catalog.map((item) => localizeItem(item, locale)));
    },

    async getInventory() {
      await wait();
      return ok(inventory.map((entry) => ({ ...entry })));
    },

    async purchaseItem(itemId) {
      await wait();
      const item = catalog.find((candidate) => candidate.id === itemId);
      if (!item) return fail("not_found");
      if (!item.purchasable) return fail("not_purchasable");
      if (inventory.some((entry) => entry.itemId === itemId)) return fail("already_owned");
      if (item.limitedQuantity !== null && (item.soldCount ?? 0) >= item.limitedQuantity) return fail("sold_out");
      if (player.usdBalance < item.priceUsd) return fail("insufficient_funds");

      player.usdBalance -= item.priceUsd;
      player.dailyChangeUsd = (player.dailyChangeUsd ?? 0) - item.priceUsd;
      let serialNo: number | null = null;
      if (item.limitedQuantity !== null) {
        item.soldCount = (item.soldCount ?? 0) + 1;
        serialNo = item.soldCount;
      }
      inventory.unshift({ itemId, acquiredAt: new Date().toISOString(), serialNo, source: "purchase" });
      record("COSMETIC_BUY", -item.priceUsd, itemId);
      return ok({ itemId, balanceUsd: player.usdBalance, inventory: inventory.map((entry) => ({ ...entry })) });
    },

    async equipItem(slot: EquipSlot, itemId) {
      await wait();
      if (itemId !== null) {
        const item = catalog.find((candidate) => candidate.id === itemId);
        if (!item || item.category !== slot) return fail("not_found");
        if (!inventory.some((entry) => entry.itemId === itemId)) return fail("not_owned");
      }
      player.loadout[slot] = itemId;
      return ok({ ...player.loadout });
    },

    async getLeaderboard(category, limit) {
      await wait();
      const { entries, me } = buildDemoLeaderboard(category, {
        nickname: player.nickname,
        photoUrl: player.photoUrl,
        level: player.level,
        value: leaderboardValue(category),
        frame: player.loadout.frame,
      });
      return ok({ category, entries: entries.slice(0, limit), me, updatedAt: new Date(now).toISOString() });
    },

    async getTasks(locale) {
      await wait();
      return ok(tasks.map((task) => localizeTask(task, locale)));
    },

    async claimTaskReward(taskId): Promise<ApiResult<{ taskId: string; rewardUsd: number; balanceUsd: number }>> {
      await wait();
      const task = tasks.find((candidate) => candidate.id === taskId);
      if (!task) return fail("not_found");
      if (task.claimed) return fail("already_claimed");
      if (task.progress < task.target) return fail("not_completed");
      task.claimed = true;
      player.usdBalance += task.rewardUsd;
      player.dailyChangeUsd = (player.dailyChangeUsd ?? 0) + task.rewardUsd;
      addXp(task.rewardXp);
      record("QUEST_REWARD", task.rewardUsd, taskId);
      return ok({ taskId, rewardUsd: task.rewardUsd, balanceUsd: player.usdBalance });
    },
  };
}
