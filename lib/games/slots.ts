import { weightedPick } from "./rng";

export type SlotSymbol = "cherry" | "lemon" | "grape" | "star" | "gem" | "seven";

/** Weights and payouts mirror SLOTS_DEFAULT_CONFIG in the bot (🍒🍋🍊⭐💎7️⃣). */
export const SLOT_SYMBOLS: readonly (readonly [SlotSymbol, number])[] = [
  ["cherry", 30],
  ["lemon", 25],
  ["grape", 20],
  ["star", 12],
  ["gem", 8],
  ["seven", 5],
];

export const TRIPLE_PAYOUT: Record<SlotSymbol, number> = {
  cherry: 5,
  lemon: 8,
  grape: 10,
  star: 20,
  gem: 40,
  seven: 100,
};

export const PAIR_PAYOUT = 1.5;

export type SlotResult = [SlotSymbol, SlotSymbol, SlotSymbol];

export function spinReels(): SlotResult {
  return [weightedPick(SLOT_SYMBOLS), weightedPick(SLOT_SYMBOLS), weightedPick(SLOT_SYMBOLS)];
}

export function slotMultiplier([a, b, c]: SlotResult): number {
  if (a === b && b === c) return TRIPLE_PAYOUT[a];
  if (a === b || b === c || a === c) return PAIR_PAYOUT;
  return 0;
}
