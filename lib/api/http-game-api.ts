import type { EquipSlot, LeaderboardCategory, Locale } from "@/types/game";
import type { DataSourceKind, GameApi } from "./game-api";
import {
  arrayOf,
  isClaimTaskResult,
  isDailyRewardResult,
  isGameTask,
  isInventoryEntry,
  isLeaderboard,
  isLoadout,
  isPlayer,
  isPurchaseResult,
  isRecord,
  isStoreItem,
  isTransaction,
} from "./guards";
import { fail, ok, toErrorCode, type ApiResult } from "./result";

export interface HttpGameApiOptions {
  kind: DataSourceKind;
  baseUrl: string;
  /** Signed Telegram initData; the server must verify it (HMAC with the bot token). */
  initData: string;
  extraHeaders?: Record<string, string>;
  timeoutMs?: number;
}

/**
 * REST adapter for the Mini App API described in docs/BOT_INTEGRATION.md.
 * Expected envelope: `{ "ok": true, "data": ... }` or `{ "ok": false, "error": { "code": "..." } }`.
 */
export function createHttpGameApi(options: HttpGameApiOptions): GameApi {
  const { baseUrl, initData, extraHeaders = {}, timeoutMs = 12_000 } = options;

  async function request<T>(
    method: "GET" | "POST",
    path: string,
    guard: (value: unknown) => value is T,
    body?: unknown,
  ): Promise<ApiResult<T>> {
    if (!initData) return fail("unauthorized", "Telegram initData is missing");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-Telegram-Init-Data": initData,
      ...extraHeaders,
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (method === "POST") headers["Idempotency-Key"] = crypto.randomUUID();

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        credentials: "omit",
      });
    } catch (error) {
      return fail("network", error instanceof Error ? error.message : "fetch failed");
    } finally {
      clearTimeout(timer);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return fail(response.status === 401 ? "unauthorized" : "invalid_response", `HTTP ${response.status}`);
    }

    if (response.status === 401) return fail("unauthorized", `HTTP 401`);
    if (response.status === 403) return fail("forbidden", `HTTP 403`);

    if (!isRecord(payload)) return fail("invalid_response", "Envelope is not an object");
    if (payload.ok === true) {
      return guard(payload.data) ? ok(payload.data) : fail("invalid_response", `Unexpected data shape for ${path}`);
    }
    const error = isRecord(payload.error) ? payload.error : {};
    const code = toErrorCode(error.code);
    return fail(code, typeof error.message === "string" ? error.message : `HTTP ${response.status}`);
  }

  const q = (params: Record<string, string | number>) =>
    `?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()}`;

  return {
    kind: options.kind,
    getPlayer: (locale: Locale) => request("GET", `/me${q({ locale })}`, isPlayer),
    getActivity: (locale: Locale, limit: number) =>
      request("GET", `/me/activity${q({ locale, limit })}`, arrayOf(isTransaction)),
    claimDailyReward: () => request("POST", "/me/daily-reward", isDailyRewardResult, {}),
    getStoreCatalog: (locale: Locale) => request("GET", `/store/items${q({ locale })}`, arrayOf(isStoreItem)),
    getInventory: () => request("GET", "/me/inventory", arrayOf(isInventoryEntry)),
    purchaseItem: (itemId: string) => request("POST", "/store/purchase", isPurchaseResult, { itemId }),
    equipItem: (slot: EquipSlot, itemId: string | null) => request("POST", "/me/loadout", isLoadout, { slot, itemId }),
    getLeaderboard: (category: LeaderboardCategory, limit: number) =>
      request("GET", `/leaderboard${q({ category, limit })}`, isLeaderboard),
    getTasks: (locale: Locale) => request("GET", `/me/tasks${q({ locale })}`, arrayOf(isGameTask)),
    claimTaskReward: (taskId: string) =>
      request("POST", `/me/tasks/${encodeURIComponent(taskId)}/claim`, isClaimTaskResult, {}),
  };
}
