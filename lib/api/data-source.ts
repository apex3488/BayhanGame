import { env } from "@/lib/config/env";
import { createDemoGameApi } from "@/lib/demo/demo-game-api";
import { setDemoSandboxEnabled } from "@/lib/demo/sandbox-gate";
import { createPublicSupabaseGameApi } from "@/lib/supabase/public-supabase-game-api";
import { createSupabaseGameApi } from "@/lib/supabase/supabase-game-api";
import type { TelegramSession } from "@/lib/telegram/webapp";
import type { DataSourceKind, GameApi } from "./game-api";
import { createBayhanApiGameApi } from "./bayhan-api-game-api";
import type { ApiErrorCode } from "./result";
import { createUnavailableGameApi } from "./unavailable-game-api";

export type LiveBlockReason = "outside_telegram" | "not_configured";

export interface DataSourceState {
  requested: DataSourceKind;
  active: DataSourceKind | "unavailable";
  /** Set when the user explicitly chose demo. */
  isDemo: boolean;
  /** Why a live source cannot be used; null in demo or when live is active. */
  blockReason: LiveBlockReason | null;
}

function unavailable(
  requested: DataSourceKind,
  blockReason: LiveBlockReason,
  code: ApiErrorCode,
  detail?: string,
  api?: GameApi,
): { api: GameApi; state: DataSourceState } {
  setDemoSandboxEnabled(false);
  return {
    api: api ?? createUnavailableGameApi(requested, code, detail),
    state: { requested, active: "unavailable", isDemo: false, blockReason },
  };
}

/**
 * Pick the GameApi for this session.
 *
 * - `demo` → in-memory sandbox (local preview only).
 * - `supabase` / `api` → real adapters when Telegram initData + config are present.
 * - Never silently substitutes demo balances/inventory when a live source was requested.
 */
export function createGameApi(session: TelegramSession): { api: GameApi; state: DataSourceState } {
  const requested = env.dataSource;

  if (requested === "demo") {
    setDemoSandboxEnabled(true);
    return {
      api: createDemoGameApi(session.user),
      state: { requested, active: "demo", isDemo: true, blockReason: null },
    };
  }

  const hasTelegram = session.status === "telegram" && Boolean(session.initData);

  if (requested === "supabase") {
    if (!hasTelegram) {
      // Public RLS reads only — never fabricate a player profile.
      const publicApi = createPublicSupabaseGameApi();
      return unavailable(
        requested,
        "outside_telegram",
        "unauthorized",
        "Telegram initData is required for player data",
        publicApi ?? undefined,
      );
    }
    const api = createSupabaseGameApi(session.initData);
    if (!api) {
      return unavailable(requested, "not_configured", "not_configured", "Supabase URL / anon key missing or unsafe");
    }
    setDemoSandboxEnabled(false);
    return { api, state: { requested, active: "supabase", isDemo: false, blockReason: null } };
  }

  if (!hasTelegram) {
    return unavailable(requested, "outside_telegram", "unauthorized", "Telegram initData is required for live mode");
  }

  if (!env.gameApiUrl) {
    return unavailable(requested, "not_configured", "not_configured", "NEXT_PUBLIC_GAME_API_URL is empty");
  }

  setDemoSandboxEnabled(false);
  return {
    api: createBayhanApiGameApi({ baseUrl: env.gameApiUrl, initData: session.initData }),
    state: { requested, active: "api", isDemo: false, blockReason: null },
  };
}
