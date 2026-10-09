import type {
  EquipSlot,
  Leaderboard,
  LeaderboardCategory,
  Locale,
  Loadout,
  Player,
} from "@/types/game";
import type { DataSourceKind, GameApi } from "./game-api";
import { isRecord } from "./guards";
import { fail, ok, type ApiResult } from "./result";

const EMPTY_LOADOUT: Loadout = {
  frame: null,
  badge: null,
  theme: null,
  name_style: null,
  avatar_effect: null,
};

export interface BayhanApiGameApiOptions {
  baseUrl: string;
  /** Signed Telegram WebApp initData — verified only on the server. */
  initData: string;
  timeoutMs?: number;
}

/**
 * Adapter for the Python FastAPI Mini App API (`miniapp_api`).
 *
 * Currently only `GET /api/me` is live. Other GameApi methods return
 * `not_configured` so the UI never invents balances or mutations.
 */
export function createBayhanApiGameApi(options: BayhanApiGameApiOptions): GameApi {
  const { baseUrl, initData, timeoutMs = 12_000 } = options;
  const root = baseUrl.replace(/\/+$/, "");

  async function fetchMe(): Promise<ApiResult<Player>> {
    if (!initData) return fail("unauthorized", "Telegram initData is missing");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${root}/api/me`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Telegram-Init-Data": initData,
        },
        signal: controller.signal,
        credentials: "omit",
      });
    } catch (error) {
      const aborted =
        (typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.name === "AbortError");
      if (aborted) {
        return fail("network", `Timeout after ${timeoutMs}ms contacting ${root}`);
      }
      const message = error instanceof Error ? error.message : "fetch failed";
      return fail("network", `${message} (${root})`);
    } finally {
      clearTimeout(timer);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return fail(statusToCode(response.status), `HTTP ${response.status}: non-JSON body`);
    }

    if (response.status === 401) {
      return fail("unauthorized", detailFromFastApi(payload) ?? "HTTP 401");
    }
    if (response.status === 403) {
      return fail("forbidden", detailFromFastApi(payload) ?? "HTTP 403");
    }
    if (response.status === 404) {
      return fail("not_found", detailFromFastApi(payload) ?? "HTTP 404");
    }
    if (!response.ok) {
      return fail(statusToCode(response.status), detailFromFastApi(payload) ?? `HTTP ${response.status}`);
    }

    const player = mapMeResponse(payload);
    if (!player) return fail("invalid_response", "Unexpected /api/me payload");
    return ok(player);
  }

  /** Mutations stay blocked until real write endpoints exist — never fake success. */
  const mutationPending = <T,>(): Promise<ApiResult<T>> =>
    Promise.resolve(fail("not_configured", "Endpoint is not implemented on the Mini App API yet"));

  /**
   * Optional reads that the FastAPI does not expose yet.
   * Return empty success so the UI does not show a fatal "failed to load" for
   * activity/tasks/store while profile/balance from /api/me works.
   * This is not demo data — just an honest empty catalog until endpoints land.
   */
  const emptyLeaderboard = (category: LeaderboardCategory): Leaderboard => ({
    category,
    entries: [],
    me: null,
    updatedAt: null,
  });

  return {
    kind: "api" satisfies DataSourceKind,
    getPlayer: (_locale: Locale) => fetchMe(),
    getActivity: async () => ok([]),
    claimDailyReward: () => mutationPending(),
    getStoreCatalog: async () => ok([]),
    getInventory: async () => ok([]),
    purchaseItem: () => mutationPending(),
    equipItem: (_slot: EquipSlot, _itemId: string | null) => mutationPending(),
    getLeaderboard: async (category: LeaderboardCategory, _limit: number) => ok(emptyLeaderboard(category)),
    getTasks: async () => ok([]),
    claimTaskReward: () => mutationPending(),
  };
}

function statusToCode(status: number) {
  if (status === 401) return "unauthorized" as const;
  if (status === 403) return "forbidden" as const;
  if (status === 404) return "not_found" as const;
  return "unknown" as const;
}

function detailFromFastApi(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  const detail = payload.detail;
  if (typeof detail === "string") return detail;
  return undefined;
}

function parseMoney(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseIntField(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
}

/**
 * Map FastAPI `MeResponse` (snake_case, decimal strings) onto the UI `Player` model.
 * Fields the backend does not return stay null / empty — never demo values.
 */
export function mapMeResponse(payload: unknown): Player | null {
  if (!isRecord(payload)) return null;

  const telegramId = parseIntField(payload.telegram_id);
  const level = parseIntField(payload.level);
  const xp = parseIntField(payload.xp);
  const usdBalance = parseMoney(payload.usd_balance);
  const btcBalance = parseMoney(payload.btc_balance);
  const bankUsd = parseMoney(payload.bank_usd);
  const gamesPlayed = parseIntField(payload.games_played);
  const gamesWon = parseIntField(payload.games_won);
  const gamesLost = parseIntField(payload.games_lost);
  const dailyStreak = parseIntField(payload.daily_streak);
  // Optional until older API builds catch up — prefer real values when present.
  const totalWagered = parseMoney(payload.total_wagered);
  const totalWon = parseMoney(payload.total_won);

  if (
    telegramId === null ||
    level === null ||
    xp === null ||
    usdBalance === null ||
    btcBalance === null ||
    bankUsd === null ||
    gamesPlayed === null ||
    gamesWon === null ||
    gamesLost === null ||
    dailyStreak === null
  ) {
    return null;
  }

  const displayName = typeof payload.display_name === "string" ? payload.display_name.trim() : "";
  const nicknameField = typeof payload.nickname === "string" ? payload.nickname.trim() : "";
  const firstName = typeof payload.first_name === "string" ? payload.first_name.trim() : "";
  const nickname = nicknameField || displayName || firstName;
  if (!nickname) return null;

  const username =
    typeof payload.username === "string" && payload.username.trim()
      ? payload.username.trim()
      : null;

  return {
    telegramId,
    nickname,
    username,
    photoUrl: null,
    level,
    xp,
    xpForNextLevel: null,
    usdBalance,
    btcBalance,
    bankUsd,
    dailyChangeUsd: null,
    registeredAt: null,
    dailyStreak,
    // Backend does not expose last_daily_at yet.
    nextDailyAt: null,
    stats: {
      gamesPlayed,
      gamesWon,
      gamesLost,
      totalWagered: totalWagered ?? 0,
      totalWon: totalWon ?? 0,
      // Achievements need separate tables/endpoints — not inventing catalog totals.
      achievementsUnlocked: 0,
      achievementsTotal: 0,
    },
    loadout: EMPTY_LOADOUT,
  };
}
