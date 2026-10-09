import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { createBayhanApiGameApi, mapMeResponse } from "./bayhan-api-game-api";
import { resetProfileLoadDiagnostic, getLastProfileLoadDiagnostic } from "./profile-load-diagnostic";

const SAMPLE_ME = {
  id: 1,
  telegram_id: 424242,
  username: "ace",
  first_name: "Ace",
  last_name: null,
  nickname: "Ace",
  display_name: "Ace",
  language: "ru",
  usd_balance: "1234.5",
  btc_balance: "0.01",
  bank_usd: "100",
  stars: 0,
  xp: 10,
  level: 2,
  games_played: 3,
  games_won: 1,
  games_lost: 2,
  total_wagered: "50",
  total_won: "20",
  referrals_count: 0,
  daily_streak: 1,
};

afterEach(() => {
  resetProfileLoadDiagnostic();
  mock.restoreAll();
});

describe("mapMeResponse", () => {
  it("maps a valid FastAPI /api/me payload", () => {
    const player = mapMeResponse(SAMPLE_ME);
    assert.ok(player);
    assert.equal(player.telegramId, 424242);
    assert.equal(player.usdBalance, 1234.5);
    assert.equal(player.nickname, "Ace");
  });

  it("rejects payloads without balances", () => {
    assert.equal(mapMeResponse({ ...SAMPLE_ME, usd_balance: null }), null);
  });
});

describe("createBayhanApiGameApi.getPlayer", () => {
  it("returns player on HTTP 200", async () => {
    mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify(SAMPLE_ME), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const api = createBayhanApiGameApi({
      baseUrl: "https://example.test",
      initData: "auth_date=1&hash=abc&user=%7B%22id%22%3A1%7D",
    });
    const result = await api.getPlayer("ru");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.data.telegramId, 424242);

    const diag = getLastProfileLoadDiagnostic();
    assert.ok(diag);
    assert.equal(diag.stage, "ok");
    assert.equal(diag.httpStatus, 200);
    assert.equal(diag.hasInitData, true);
    assert.equal(diag.code, null);
  });

  it("maps forged/invalid signature to unauthorized (401)", async () => {
    mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify({ detail: "Invalid initData signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const api = createBayhanApiGameApi({
      baseUrl: "https://example.test",
      initData: "auth_date=1&hash=bad&user=%7B%22id%22%3A1%7D",
    });
    const result = await api.getPlayer("ru");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, "unauthorized");
      assert.equal(result.error.httpStatus, 401);
      assert.equal(result.error.stage, "http");
    }
  });

  it("maps missing player to not_found (404)", async () => {
    mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify({ detail: "Player not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const api = createBayhanApiGameApi({
      baseUrl: "https://example.test",
      initData: "auth_date=1&hash=abc&user=%7B%22id%22%3A1%7D",
    });
    const result = await api.getPlayer("ru");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, "not_found");
      assert.equal(result.error.httpStatus, 404);
    }
  });

  it("maps network failure to network stage", async () => {
    mock.method(globalThis, "fetch", async () => {
      throw new TypeError("Failed to fetch");
    });

    const api = createBayhanApiGameApi({
      baseUrl: "https://example.test",
      initData: "auth_date=1&hash=abc&user=%7B%22id%22%3A1%7D",
    });
    const result = await api.getPlayer("ru");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, "network");
      assert.equal(result.error.stage, "network");
      assert.equal(result.error.httpStatus, undefined);
    }

    const diag = getLastProfileLoadDiagnostic();
    assert.equal(diag?.hasInitData, true);
    assert.equal(diag?.stage, "network");
  });

  it("does not send a request when initData is missing", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      throw new Error("fetch should not be called");
    });

    const api = createBayhanApiGameApi({ baseUrl: "https://example.test", initData: "" });
    const result = await api.getPlayer("ru");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, "unauthorized");
      assert.equal(result.error.stage, "no_init_data");
    }
    assert.equal(fetchMock.mock.callCount(), 0);
  });

  it("keeps mutations blocked and optional reads empty", async () => {
    const api = createBayhanApiGameApi({
      baseUrl: "https://example.test",
      initData: "auth_date=1&hash=abc&user=%7B%22id%22%3A1%7D",
    });
    const activity = await api.getActivity("ru", 5);
    const tasks = await api.getTasks("ru");
    const claim = await api.claimDailyReward();
    assert.equal(activity.ok, true);
    if (activity.ok) assert.deepEqual(activity.data, []);
    assert.equal(tasks.ok, true);
    if (tasks.ok) assert.deepEqual(tasks.data, []);
    assert.equal(claim.ok, false);
    if (!claim.ok) assert.equal(claim.error.code, "not_configured");
  });
});
