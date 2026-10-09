/**
 * BAYHAN GAME Mini App API — Supabase Edge Function.
 *
 * Secrets (Dashboard → Edge Functions → Secrets, never in frontend):
 *   TELEGRAM_BOT_TOKEN
 *   ALLOWED_ORIGIN   e.g. https://USERNAME.github.io
 *
 * Deploy:
 *   supabase functions deploy miniapp-api --project-ref <ref>
 *
 * Contract: docs/BOT_INTEGRATION.md
 * Auth: HMAC validation of Telegram WebApp initData (bot token stays server-side).
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-telegram-init-data, idempotency-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type TgUser = { id: number; first_name?: string; last_name?: string; username?: string; photo_url?: string; language_code?: string };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function err(code: string, status = 400, message?: string): Response {
  return json({ ok: false, error: { code, message } }, status);
}

async function hmacSha256(key: BufferSource, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data)));
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyInitData(raw: string, maxAgeSec = 86_400): Promise<TgUser | null> {
  if (!raw || !BOT_TOKEN) return null;
  const params = new URLSearchParams(raw);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const checkString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = await hmacSha256(new TextEncoder().encode("WebAppData"), BOT_TOKEN);
  const expected = toHex(await hmacSha256(secret, checkString));
  if (expected !== hash) return null;
  const authDate = Number(params.get("auth_date") ?? "0");
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSec) return null;
  try {
    return JSON.parse(params.get("user") ?? "null") as TgUser;
  } catch {
    return null;
  }
}

function db() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function xpForNext(level: number): number {
  return level * 1000;
}

async function ensurePlayer(client: ReturnType<typeof db>, user: TgUser) {
  const { data: existing } = await client.from("players").select("*").eq("telegram_id", user.id).maybeSingle();
  if (existing) return existing;
  const nickname = user.first_name?.trim() || user.username || "Player";
  const { data, error } = await client
    .from("players")
    .insert({
      telegram_id: user.id,
      nickname,
      username: user.username ?? null,
      photo_url: user.photo_url ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  await client.from("player_loadouts").insert({ player_id: data.id });
  return data;
}

function mapPlayer(row: Record<string, unknown>, loadout: Record<string, unknown> | null) {
  const level = Number(row.level);
  return {
    telegramId: Number(row.telegram_id),
    nickname: String(row.nickname ?? "Player"),
    username: (row.username as string | null) ?? null,
    photoUrl: (row.photo_url as string | null) ?? null,
    level,
    xp: Number(row.xp),
    xpForNextLevel: xpForNext(level),
    usdBalance: Number(row.usd_balance),
    btcBalance: Number(row.btc_balance),
    bankUsd: Number(row.bank_usd),
    dailyChangeUsd: null,
    registeredAt: row.created_at ?? null,
    dailyStreak: Number(row.daily_streak),
    nextDailyAt: row.last_daily_at
      ? new Date(new Date(String(row.last_daily_at)).getTime() + 86_400_000).toISOString()
      : null,
    stats: {
      gamesPlayed: Number(row.games_played),
      gamesWon: Number(row.games_won),
      gamesLost: Number(row.games_lost),
      totalWagered: Number(row.total_wagered),
      totalWon: Number(row.total_won),
      achievementsUnlocked: 0,
      achievementsTotal: 0,
    },
    loadout: {
      frame: (loadout?.frame_item_id as string | null) ?? null,
      badge: (loadout?.badge_item_id as string | null) ?? null,
      theme: (loadout?.theme_item_id as string | null) ?? null,
      name_style: (loadout?.name_style_item_id as string | null) ?? null,
      avatar_effect: (loadout?.avatar_effect_item_id as string | null) ?? null,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (!BOT_TOKEN || !SUPABASE_URL || !SERVICE_KEY) return err("not_configured", 503);

  const user = await verifyInitData(req.headers.get("x-telegram-init-data") ?? "");
  if (!user?.id) return err("unauthorized", 401);

  const url = new URL(req.url);
  // Path after /functions/v1/miniapp-api
  const path = url.pathname.replace(/^\/miniapp-api/, "").replace(/\/+$/, "") || "/";
  const client = db();
  const idem = req.headers.get("idempotency-key");

  try {
    const player = await ensurePlayer(client, user);

    if (req.method === "GET" && path === "/me") {
      const { data: loadout } = await client.from("player_loadouts").select("*").eq("player_id", player.id).maybeSingle();
      return json({ ok: true, data: mapPlayer(player, loadout) });
    }

    if (req.method === "GET" && path === "/me/activity") {
      const limit = Math.min(50, Number(url.searchParams.get("limit") ?? "20"));
      const { data, error } = await client
        .from("transactions")
        .select("id, type, currency, amount, context, created_at")
        .eq("player_id", player.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return err("network", 502, error.message);
      return json({
        ok: true,
        data: (data ?? []).map((tx) => ({
          id: tx.id,
          type: tx.type,
          currency: tx.currency,
          amount: Number(tx.amount),
          createdAt: tx.created_at,
          context: tx.context,
        })),
      });
    }

    if (req.method === "GET" && path === "/me/inventory") {
      const { data, error } = await client.from("player_inventory").select("*").eq("player_id", player.id);
      if (error) return err("network", 502, error.message);
      return json({
        ok: true,
        data: (data ?? []).map((row) => ({
          itemId: row.item_id,
          acquiredAt: row.acquired_at,
          serialNo: row.serial_no,
          source: row.source,
        })),
      });
    }

    if (req.method === "GET" && path === "/store/items") {
      const locale = url.searchParams.get("locale") ?? "ru";
      const { data, error } = await client.from("store_items").select("*").eq("enabled", true).order("sort_order");
      if (error) return err("network", 502, error.message);
      return json({
        ok: true,
        data: (data ?? []).map((row) => {
          const name = row.name as Record<string, string>;
          const description = row.description as Record<string, string>;
          return {
            id: row.id,
            category: row.category,
            name: name[locale] ?? name.ru ?? name.en ?? row.id,
            description: description[locale] ?? description.ru ?? "",
            rarity: row.rarity,
            priceUsd: Number(row.price_usd),
            purchasable: row.purchasable,
            isLimited: row.is_limited,
            limitedQuantity: row.limited_quantity,
            soldCount: row.sold_count,
            featured: row.featured,
            preview: row.preview,
          };
        }),
      });
    }

    if (req.method === "POST" && path === "/store/purchase") {
      const body = (await req.json()) as { itemId?: string };
      if (!body.itemId) return err("unknown", 400, "itemId required");
      const { data, error } = await client.rpc("purchase_item", {
        p_telegram_id: user.id,
        p_item_id: body.itemId,
        p_key: idem,
      });
      if (error) {
        const msg = error.message ?? "";
        if (msg.includes("insufficient_funds")) return err("insufficient_funds", 400);
        if (msg.includes("already_owned")) return err("already_owned", 400);
        if (msg.includes("sold_out")) return err("sold_out", 400);
        if (msg.includes("not_purchasable")) return err("not_purchasable", 400);
        if (msg.includes("not_found")) return err("not_found", 404);
        return err("unknown", 500, error.message);
      }
      return json({ ok: true, data });
    }

    if (req.method === "POST" && path === "/me/loadout") {
      const body = (await req.json()) as { slot?: string; itemId?: string | null };
      const slotMap: Record<string, string> = {
        frame: "frame_item_id",
        badge: "badge_item_id",
        theme: "theme_item_id",
        name_style: "name_style_item_id",
        avatar_effect: "avatar_effect_item_id",
      };
      const column = body.slot ? slotMap[body.slot] : undefined;
      if (!column) return err("unknown", 400, "invalid slot");
      if (body.itemId) {
        const { data: owned } = await client
          .from("player_inventory")
          .select("id")
          .eq("player_id", player.id)
          .eq("item_id", body.itemId)
          .maybeSingle();
        if (!owned) return err("not_owned", 400);
      }
      const { error } = await client.from("player_loadouts").upsert({
        player_id: player.id,
        [column]: body.itemId ?? null,
      });
      if (error) return err("unknown", 500, error.message);
      const { data: loadout } = await client.from("player_loadouts").select("*").eq("player_id", player.id).single();
      return json({
        ok: true,
        data: {
          frame: loadout?.frame_item_id ?? null,
          badge: loadout?.badge_item_id ?? null,
          theme: loadout?.theme_item_id ?? null,
          name_style: loadout?.name_style_item_id ?? null,
          avatar_effect: loadout?.avatar_effect_item_id ?? null,
        },
      });
    }

    if (req.method === "GET" && path === "/leaderboard") {
      const category = url.searchParams.get("category") ?? "capital";
      const limit = Math.min(100, Number(url.searchParams.get("limit") ?? "10"));
      const { data, error } = await client
        .from("leaderboard_entries")
        .select("*")
        .eq("category", category)
        .order("rank")
        .limit(limit);
      if (error) return err("network", 502, error.message);
      const { data: meRow } = await client
        .from("leaderboard_entries")
        .select("*")
        .eq("category", category)
        .eq("public_id", player.public_id)
        .maybeSingle();
      const entries = (data ?? []).map((row) => ({
        rank: row.rank,
        telegramId: null,
        nickname: row.nickname,
        photoUrl: row.photo_url,
        level: row.level,
        value: Number(row.value),
        isCurrentPlayer: row.public_id === player.public_id,
        frame: row.frame_item_id,
      }));
      return json({
        ok: true,
        data: {
          category,
          entries,
          me: meRow
            ? {
                rank: meRow.rank,
                telegramId: user.id,
                nickname: meRow.nickname,
                photoUrl: meRow.photo_url,
                level: meRow.level,
                value: Number(meRow.value),
                isCurrentPlayer: true,
                frame: meRow.frame_item_id,
              }
            : null,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    if (req.method === "GET" && path === "/me/tasks") {
      const locale = url.searchParams.get("locale") ?? "ru";
      const { data: defs, error } = await client.from("tasks").select("*").eq("active", true).order("sort_order");
      if (error) return err("network", 502, error.message);
      const { data: progress } = await client.from("player_tasks").select("*").eq("player_id", player.id);
      const byTask = new Map((progress ?? []).map((row) => [row.task_id, row]));
      return json({
        ok: true,
        data: (defs ?? []).map((task) => {
          const title = task.title as Record<string, string>;
          const description = task.description as Record<string, string>;
          const row = byTask.get(task.id);
          const target = Number(task.target);
          const p = Number(row?.progress ?? 0);
          return {
            id: task.id,
            period: task.period,
            title: title[locale] ?? title.ru ?? task.id,
            description: description[locale] ?? description.ru ?? "",
            target,
            progress: Math.min(p, target),
            rewardUsd: Number(task.reward_usd),
            rewardXp: Number(task.reward_xp),
            status: row?.status ?? "in_progress",
            icon: task.icon,
          };
        }),
      });
    }

    // Daily reward / task claim: implement when bot economy sync rules are confirmed.
    if (req.method === "POST" && (path === "/me/daily-reward" || path.startsWith("/me/tasks/"))) {
      return err("not_configured", 501, "Wire to bot economy or complete RPC — refusing client-side credits");
    }

    return err("not_found", 404);
  } catch (e) {
    return err("unknown", 500, e instanceof Error ? e.message : "error");
  }
});
