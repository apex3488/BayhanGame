import type { Transaction, TransactionType } from "@/types/game";

const MINUTE = 60_000;

const TEMPLATE: { type: TransactionType; amount: number; minutesAgo: number; context: string | null }[] = [
  { type: "GAME_WIN", amount: 4_800, minutesAgo: 12, context: "mines" },
  { type: "GAME_BET", amount: -2_000, minutesAgo: 13, context: "mines" },
  { type: "DAILY_REWARD", amount: 500, minutesAgo: 95, context: null },
  { type: "GAME_WIN", amount: 1_900, minutesAgo: 160, context: "updown" },
  { type: "GAME_BET", amount: -1_000, minutesAgo: 161, context: "updown" },
  { type: "COSMETIC_BUY", amount: -25_000, minutesAgo: 60 * 20, context: "frame_neon" },
  { type: "QUEST_REWARD", amount: 1_500, minutesAgo: 60 * 26, context: "daily_mine_resources" },
  { type: "REFERRAL_REWARD", amount: 500_000, minutesAgo: 60 * 50, context: null },
];

export function buildDemoActivity(now: number): Transaction[] {
  return TEMPLATE.map((entry, index) => ({
    id: `demo-tx-${index}`,
    type: entry.type,
    currency: "USD",
    amount: entry.amount,
    createdAt: new Date(now - entry.minutesAgo * MINUTE).toISOString(),
    context: entry.context,
  }));
}
