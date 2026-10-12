import {
  Bomb,
  ChartCandlestick,
  Cherry,
  CircleDot,
  Crosshair,
  Dices,
  Disc3,
  Goal,
  Rocket,
  Spade,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type GameModeId =
  | "crash"
  | "mines"
  | "updown"
  | "slots"
  | "daily"
  | "casino"
  | "spin"
  | "dice"
  | "darts"
  | "basketball"
  | "bowling"
  | "trade";

export type GameModeKind = "live" | "practice" | "challenge" | "bot";

export interface GameMode {
  id: GameModeId;
  kind: GameModeKind;
  icon: LucideIcon;
  /** In-app route for practice prototypes and challenges. */
  href: string | null;
}

/** Modes that exist in the Python bot (bot/constants.py GAME_*) + Mini App live Crash. */
export const GAME_MODES: readonly GameMode[] = [
  { id: "crash", kind: "live", icon: Rocket, href: "/games/crash" },
  { id: "mines", kind: "practice", icon: Bomb, href: "/games/mines" },
  { id: "updown", kind: "practice", icon: ChartCandlestick, href: "/games/updown" },
  { id: "slots", kind: "practice", icon: Cherry, href: "/games/slots" },
  { id: "daily", kind: "challenge", icon: Target, href: "/tasks" },
  { id: "casino", kind: "bot", icon: Spade, href: null },
  { id: "spin", kind: "bot", icon: Disc3, href: null },
  { id: "dice", kind: "bot", icon: Dices, href: null },
  { id: "darts", kind: "bot", icon: Crosshair, href: null },
  { id: "basketball", kind: "bot", icon: Goal, href: null },
  { id: "bowling", kind: "bot", icon: CircleDot, href: null },
  { id: "trade", kind: "bot", icon: TrendingUp, href: null },
];

export const PRACTICE_MODES = GAME_MODES.filter((mode) => mode.kind === "practice");
