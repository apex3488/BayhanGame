import { randomInt } from "./rng";

export const MINES_BOARD_SIZE = 25;
export const MINES_OPTIONS = [3, 5, 10] as const;
export type MinesCount = (typeof MINES_OPTIONS)[number];

/** Copied from MINES_DEFAULT_CONFIG in bot/services/settings_service.py. */
const MULTIPLIERS: Record<MinesCount, readonly number[]> = {
  3: [1.12, 1.28, 1.48, 1.72, 2.02, 2.4, 2.88, 3.5, 4.3, 5.4, 6.9, 9, 12, 16.5, 23, 33, 50, 80, 140, 250, 500, 1000],
  5: [1.2, 1.5, 1.9, 2.45, 3.2, 4.25, 5.8, 8, 11.5, 17, 26, 42, 70, 120, 220, 420, 850, 1800, 4000, 10000],
  10: [1.45, 2.2, 3.4, 5.4, 9, 15.5, 28, 52, 100, 200, 420, 950, 2300, 6000, 18000],
};

export function placeMines(count: MinesCount): Set<number> {
  const mines = new Set<number>();
  while (mines.size < count) mines.add(randomInt(MINES_BOARD_SIZE));
  return mines;
}

export function minesMultiplier(count: MinesCount, opened: number): number {
  if (opened <= 0) return 1;
  const table = MULTIPLIERS[count];
  return table[Math.min(opened, table.length) - 1] ?? 1;
}

export function maxSafeCells(count: MinesCount): number {
  return MINES_BOARD_SIZE - count;
}
