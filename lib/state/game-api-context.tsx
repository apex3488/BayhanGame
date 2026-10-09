"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DataSourceState } from "@/lib/api/data-source";
import type { GameApi } from "@/lib/api/game-api";

interface GameApiValue {
  api: GameApi;
  source: DataSourceState;
  /** True only when NEXT_PUBLIC_DATA_SOURCE=demo and the sandbox API is active. */
  isDemo: boolean;
  /** Live source was requested but Telegram/config is missing — show connection UI, not fake data. */
  isUnavailable: boolean;
  isLive: boolean;
}

const GameApiContext = createContext<GameApiValue | null>(null);

export function GameApiProvider({ api, source, children }: { api: GameApi; source: DataSourceState; children: ReactNode }) {
  const isDemo = source.isDemo;
  const isUnavailable = source.active === "unavailable";
  const isLive = source.active === "supabase" || source.active === "api";
  return (
    <GameApiContext.Provider value={{ api, source, isDemo, isUnavailable, isLive }}>{children}</GameApiContext.Provider>
  );
}

export function useGameApi(): GameApiValue {
  const value = useContext(GameApiContext);
  if (!value) throw new Error("useGameApi must be used inside <GameApiProvider>");
  return value;
}
