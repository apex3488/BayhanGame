import type { LeaderboardCategory, LeaderboardEntry } from "@/types/game";

/** Deterministic PRNG so demo rankings are identical across reloads. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PREFIXES = ["Nova", "Atlas", "Blitz", "Frost", "Raven", "Titan", "Volt", "Zenith", "Orion", "Echo", "Pulse", "Drift", "Onyx", "Vector", "Quantum", "Nexus", "Cobalt", "Arctic", "Static", "Comet"];
const SUFFIXES = ["", "X", "Pro", "One", "UZ", "777", "Prime", "_TSH", "Ace", "Zero"];
const FRAMES = [null, null, null, "frame_cyber", "frame_neon", "frame_ice", "frame_diamond", "frame_galaxy"];

const CONFIG: Record<LeaderboardCategory, { seed: number; top: number; decay: number }> = {
  capital: { seed: 11, top: 9_800_000, decay: 0.962 },
  level: { seed: 23, top: 64, decay: 0.982 },
  wins: { seed: 37, top: 2_400, decay: 0.962 },
};

export interface DemoPlayerRow {
  nickname: string;
  photoUrl: string | null;
  level: number;
  value: number;
  frame: string | null;
}

/** Up to 100 synthetic rivals with the demo player inserted at the position its value earns. */
export function buildDemoLeaderboard(
  category: LeaderboardCategory,
  player: DemoPlayerRow,
): { entries: LeaderboardEntry[]; me: LeaderboardEntry } {
  const { seed, top, decay } = CONFIG[category];
  const random = mulberry32(seed);
  const entries: LeaderboardEntry[] = [];
  let me: LeaderboardEntry | null = null;
  let value = top;
  let rank = 1;

  while (rank <= 100 || !me) {
    const rivalValue = category === "level" ? Math.max(1, Math.round(value)) : Math.round(value);
    if (!me && player.value >= rivalValue) {
      me = { rank, telegramId: null, isCurrentPlayer: true, ...player };
      if (rank <= 100) entries.push(me);
      rank += 1;
      continue;
    }
    if (rank <= 100) {
      const prefix = PREFIXES[Math.floor(random() * PREFIXES.length)] ?? "Player";
      const suffix = SUFFIXES[Math.floor(random() * SUFFIXES.length)] ?? "";
      entries.push({
        rank,
        telegramId: null,
        nickname: `${prefix}${suffix}`,
        photoUrl: null,
        level: category === "level" ? rivalValue : Math.max(3, Math.round(72 - rank * 0.55 + random() * 8)),
        value: rivalValue,
        isCurrentPlayer: false,
        frame: FRAMES[Math.floor(random() * FRAMES.length)] ?? null,
      });
    }
    value *= decay - random() * 0.006;
    rank += 1;
    if (rank > 10_000 && !me) me = { rank, telegramId: null, isCurrentPlayer: true, ...player };
  }
  return { entries, me };
}
