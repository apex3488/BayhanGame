import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";
import { SignJWT, jwtVerify } from "npm:jose@5.9.6";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ORIGIN_FALLBACK = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const STARTING = Number(Deno.env.get("MINIAPP_STARTING_BALANCE_USD") ?? "50000");
const CRASH_MIN = Number(Deno.env.get("MINIAPP_CRASH_MIN_BET") ?? "1");
/** No hard max — stake is capped only by wallet balance. */

/** Growth in multiplier per second (UI + settlement). ~0.06 → 2.00x ≈ 16.7s */
const CRASH_GROWTH_PER_SEC = Number(Deno.env.get("MINIAPP_CRASH_GROWTH") ?? "0.06");
const JWT_TTL = Number(Deno.env.get("MINIAPP_JWT_TTL_SECONDS") ?? String(60 * 60 * 24 * 7));
const BOOTSTRAP = Deno.env.get("MINIAPP_ADMIN_BOOTSTRAP_SECRET") ?? "";

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || ORIGIN_FALLBACK;
  const allowOrigin = !origin || origin === "null" ? "*" : origin;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info, x-supabase-auth, x-bayhan-token, x-access-token, x-authorization, accept",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

type UserRow = {
  id: number;
  login: string;
  password_hash: string;
  display_name: string;
  is_admin: boolean;
  is_banned: boolean;
  wallet_usd: number;
  bank_usd: number;
  level: number;
  xp: number;
  created_at: string;
};

const T = {
  users: "ma_users",
  transactions: "ma_transactions",
  promo_codes: "ma_promo_codes",
  promo_redemptions: "ma_promo_redemptions",
  crash_rounds: "ma_crash_rounds",
  crash_bets: "ma_crash_bets",
  loadouts: "ma_loadouts",
  audit_logs: "ma_audit_logs",
} as const;

let _cors: Record<string, string> = { "Access-Control-Allow-Origin": "*" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ..._cors, "Content-Type": "application/json" },
  });
}
function err(detail: string, status = 400): Response {
  return json({ detail }, status);
}
function db(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function jwtSecretKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("MINIAPP_JWT_SECRET") ?? `bayhan-miniapp-jwt:${SERVICE_KEY || "dev"}`;
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", hash, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function signToken(userId: number, isAdmin: boolean): Promise<string> {
  return new SignJWT({ adm: isAdmin })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${JWT_TTL}s`)
    .setJti(crypto.randomUUID())
    .sign(await jwtSecretKey());
}
function extractSessionToken(req: Request, url: URL, bodyToken?: string | null): string | null {
  // Prefer custom headers so Supabase gateway Authorization can stay as anon JWT.
  // Telegram WebViews may strip some headers — also accept query/body.
  const candidates = [
    req.headers.get("x-bayhan-token"),
    req.headers.get("x-access-token"),
    req.headers.get("x-authorization"),
    url.searchParams.get("access_token"),
    bodyToken,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const value = raw.replace(/^Bearer\s+/i, "").trim();
    if (value) return value;
  }
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  // Ignore obvious Supabase anon JWTs (contain "role":"anon" in payload when decoded loosely).
  try {
    const mid = m[1].split(".")[1];
    if (mid) {
      const json = JSON.parse(atob(mid.replace(/-/g, "+").replace(/_/g, "/")));
      if (json?.role === "anon" || json?.role === "service_role") return null;
    }
  } catch {
    // not a JWT we can inspect — try verifying later
  }
  return m[1].trim();
}

async function userFromAuth(req: Request, url: URL, bodyToken?: string | null): Promise<UserRow | Response> {
  const token = extractSessionToken(req, url, bodyToken);
  if (!token) return err("Unauthorized", 401);
  try {
    const { payload } = await jwtVerify(token, await jwtSecretKey(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (!Number.isFinite(id)) return err("Unauthorized", 401);
    const { data, error } = await db().from(T.users).select("*").eq("id", id).maybeSingle();
    if (error || !data) return err("Unauthorized", 401);
    if ((data as UserRow).is_banned) return err("Account banned", 403);
    return data as UserRow;
  } catch {
    return err("Unauthorized", 401);
  }
}

async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const data = await req.json();
    if (data && typeof data === "object" && !Array.isArray(data)) return data as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}
function validateLogin(login: string): string | null {
  const value = login.trim().toLowerCase();
  if (value.length < 3 || value.length > 32 || !/^[a-z][a-z0-9_]*$/.test(value)) return null;
  return value;
}
function validatePassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128;
}
function publicUser(u: UserRow) {
  return {
    id: u.id,
    login: u.login,
    display_name: u.display_name,
    is_admin: u.is_admin,
    is_banned: u.is_banned,
    wallet_usd: u.wallet_usd,
    bank_usd: u.bank_usd,
    level: u.level,
    xp: u.xp,
    created_at: u.created_at,
  };
}
async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
/**
 * Provably-fair crash point in basis points.
 * Full entropy from HMAC + extra random salt baked into server seed at insert.
 * Distribution: ~5% @1.00x, heavy mass under 3x, rare tails up to 100x.
 */
async function crashMultiplierBp(serverSeed: string, clientSeed: string, nonce: number): Promise<number> {
  const msg = new TextEncoder().encode(`${serverSeed}:${clientSeed}:${nonce}:crash-v2`);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(serverSeed),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  // 52-bit uniform float in [0, 1)
  let acc = 0;
  for (let i = 0; i < 7; i++) acc = acc * 256 + bytes[i]!;
  const u = (acc % Number.MAX_SAFE_INTEGER) / Number.MAX_SAFE_INTEGER;
  // Instant bust ~5%
  if (u < 0.05) return 100;
  // Inverse-curve style: e = house edge ~3%, crash = (1-e)/(1-u')
  const u2 = (u - 0.05) / 0.95;
  const e = 0.03;
  const raw = Math.floor(100 * ((1 - e) / Math.max(1e-12, 1 - u2)));
  return Math.max(101, Math.min(raw, 10_000));
}

function growthBpFromElapsed(elapsedSec: number): number {
  return 100 + Math.floor(Math.max(0, elapsedSec) * CRASH_GROWTH_PER_SEC * 100);
}
async function writeAudit(client: SupabaseClient, actor: number | null, action: string, target = "") {
  await client.from(T.audit_logs).insert({ actor_user_id: actor, action, target, detail: "" });
}
async function getOrCreateOpenRound(client: SupabaseClient, clientSeed?: string) {
  const { data: open } = await client.from(T.crash_rounds).select("*").eq("status", "open").order("id", { ascending: false }).limit(1).maybeSingle();
  if (open) return open;

  const { data: running } = await client.from(T.crash_rounds).select("*").eq("status", "running").order("id", { ascending: false }).limit(1).maybeSingle();
  if (running) {
    const crashBp = Number(running.crash_multiplier_bp);
    const started = running.started_at ? Date.parse(String(running.started_at)) : Date.now();
    const elapsedBp = growthBpFromElapsed(Math.max(0, (Date.now() - started) / 1000));
    if (elapsedBp < crashBp) return running;
    await client.from(T.crash_rounds).update({ status: "crashed", crashed_at: new Date().toISOString() }).eq("id", running.id);
    await client.from(T.crash_bets).update({ status: "lost", settled_at: new Date().toISOString(), payout_usd: 0 }).eq("round_id", running.id).eq("status", "active");
  }

  const serverSeed = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const cseed = (clientSeed || crypto.randomUUID().replace(/-/g, "").slice(0, 16)).slice(0, 64);
  const { data, error } = await client.from(T.crash_rounds).insert({
    public_id: crypto.randomUUID(),
    server_seed_hash: await sha256Hex(serverSeed),
    server_seed: serverSeed,
    client_seed: cseed,
    nonce: 1,
    crash_multiplier_bp: await crashMultiplierBp(serverSeed, cseed, 1),
    status: "open",
  }).select("*").single();
  if (error) throw error;
  return data;
}
function mapRound(row: Record<string, unknown>, reveal: boolean) {
  return {
    public_id: row.public_id,
    server_seed_hash: row.server_seed_hash,
    server_seed: reveal ? row.server_seed : null,
    client_seed: row.client_seed,
    nonce: row.nonce,
    crash_multiplier: reveal ? Number(row.crash_multiplier_bp) / 100 : 0,
    status: row.status,
    started_at: row.started_at,
    crashed_at: row.crashed_at,
  };
}

function routePath(pathname: string): string {
  const marker = "/bayhan-api";
  const idx = pathname.indexOf(marker);
  let path = idx >= 0 ? pathname.slice(idx + marker.length) || "/" : pathname;
  if (!path.startsWith("/")) path = `/${path}`;
  return path;
}

function flightStartedMs(bet: Record<string, unknown>, round: Record<string, unknown>): number {
  // Prefer round.started_at (set explicitly at bet time as ISO). Fall back to bet.created_at.
  const candidates = [round.started_at, bet.created_at];
  for (const raw of candidates) {
    if (raw == null) continue;
    const ms = Date.parse(String(raw));
    if (Number.isFinite(ms)) return ms;
  }
  return Date.now();
}

function flightElapsedSec(bet: Record<string, unknown>, round: Record<string, unknown>): number {
  return Math.max(0, (Date.now() - flightStartedMs(bet, round)) / 1000);
}

async function settleIfCrashed(
  client: SupabaseClient,
  bet: Record<string, unknown>,
  round: Record<string, unknown>,
): Promise<{ crashed: boolean; crash_multiplier: number; elapsed_sec: number; server_multiplier: number }> {
  const crashBp = Number(round.crash_multiplier_bp);
  const elapsedSec = flightElapsedSec(bet, round);
  const elapsedBp = growthBpFromElapsed(elapsedSec);
  const serverMult = Math.min(elapsedBp, crashBp) / 100;
  if (elapsedBp < crashBp) {
    return { crashed: false, crash_multiplier: 0, elapsed_sec: elapsedSec, server_multiplier: serverMult };
  }
  await client.from(T.crash_bets).update({ status: "lost", settled_at: new Date().toISOString(), payout_usd: 0 }).eq("id", bet.id);
  await client.from(T.crash_rounds).update({ status: "crashed", crashed_at: new Date().toISOString() }).eq("id", round.id);
  return { crashed: true, crash_multiplier: crashBp / 100, elapsed_sec: elapsedSec, server_multiplier: crashBp / 100 };
}

Deno.serve(async (req: Request) => {
  _cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: _cors });
  if (!SUPABASE_URL || !SERVICE_KEY) return err("not_configured", 503);
  const url = new URL(req.url);
  const path = routePath(url.pathname);
  try {
    if (req.method === "GET" && (path === "/" || path === "/health")) {
      return json({
        status: "ok",
        service: "bayhan-miniapp-v2",
        database: { engine: "supabase-postgres", basename: "supabase", is_bot_db: false, path_exists: true },
      });
    }

    if (req.method === "POST" && path === "/api/auth/register") {
      const body = await req.json().catch(() => null) as { login?: string; password?: string; display_name?: string } | null;
      if (!body) return err("Invalid body");
      const login = validateLogin(body.login ?? "");
      if (!login || !validatePassword(body.password ?? "")) return err("Invalid login or password");
      const client = db();
      const { data: exists } = await client.from(T.users).select("id").eq("login", login).maybeSingle();
      if (exists) return err("Invalid login or password");
      const display = ((body.display_name || login).trim() || login).slice(0, 64);
      const { data: user, error } = await client.from(T.users).insert({
        login,
        password_hash: bcrypt.hashSync(body.password!, 10),
        display_name: display,
        wallet_usd: STARTING,
        bank_usd: 0,
        starting_granted: true,
        level: 1,
        xp: 0,
      }).select("*").single();
      if (error || !user) return err(error?.message ?? "Register failed", 500);
      await client.from(T.loadouts).insert({ user_id: user.id });
      await client.from(T.transactions).insert({
        user_id: user.id, type: "STARTING_CAPITAL", amount_usd: STARTING, wallet_after: STARTING, bank_after: 0,
        reason: "Starting capital", status: "completed", idempotency_key: `start:${user.id}`,
      });
      await writeAudit(client, user.id, "user.register", String(user.id));
      return json({ access_token: await signToken(user.id, user.is_admin), token_type: "bearer" });
    }

    if (req.method === "POST" && path === "/api/auth/login") {
      const body = await req.json().catch(() => null) as { login?: string; password?: string } | null;
      if (!body) return err("Invalid body");
      const login = validateLogin(body.login ?? "") ?? "";
      const { data: user } = await db().from(T.users).select("*").eq("login", login).maybeSingle();
      if (!user || !bcrypt.compareSync(body.password ?? "", user.password_hash)) return err("Invalid login or password", 401);
      if (user.is_banned) return err("Account banned", 403);
      await writeAudit(db(), user.id, "user.login", String(user.id));
      return json({ access_token: await signToken(user.id, user.is_admin), token_type: "bearer" });
    }

    if (req.method === "POST" && path === "/api/admin/bootstrap") {
      if (!BOOTSTRAP) return err("Bootstrap disabled", 403);
      const body = await req.json().catch(() => null) as { bootstrap_secret?: string; login?: string; password?: string } | null;
      if (!body || body.bootstrap_secret !== BOOTSTRAP) return err("Forbidden", 403);
      const client = db();
      const { data: admins } = await client.from(T.users).select("id").eq("is_admin", true).limit(1);
      if (admins?.length) return err("Admin already exists", 409);
      const login = validateLogin(body.login ?? "");
      if (!login || !validatePassword(body.password ?? "")) return err("Invalid login or password");
      const { data: user, error } = await client.from(T.users).insert({
        login, password_hash: bcrypt.hashSync(body.password!, 10), display_name: login, is_admin: true,
        wallet_usd: STARTING, bank_usd: 0, starting_granted: true,
      }).select("*").single();
      if (error || !user) return err(error?.message ?? "Failed", 500);
      await client.from(T.loadouts).insert({ user_id: user.id });
      await writeAudit(client, user.id, "admin.bootstrap", String(user.id));
      return json({ access_token: await signToken(user.id, true), token_type: "bearer" });
    }

    // Read body once (Telegram may put access_token here).
    const postBody = req.method === "POST" ? await readJsonBody(req) : null;
    const bodyToken = typeof postBody?.access_token === "string" ? postBody.access_token : null;
    const authed = await userFromAuth(req, url, bodyToken);
    if (authed instanceof Response) return authed;
    const user = authed;
    const client = db();

    if (req.method === "GET" && path === "/api/auth/me") return json(publicUser(user));

    if (req.method === "GET" && path.startsWith("/api/economy/transactions")) {
      const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") ?? "50"), 100));
      const { data } = await client.from(T.transactions).select("*").eq("user_id", user.id).order("id", { ascending: false }).limit(limit);
      return json(data ?? []);
    }

    if (req.method === "POST" && path === "/api/economy/transfer") {
      const body = postBody as { amount_usd?: number; direction?: string; idempotency_key?: string } | null;
      if (!body?.idempotency_key || !body.amount_usd || !body.direction) return err("amount_usd, direction, idempotency_key required");
      const amount = Math.floor(Number(body.amount_usd));
      if (!Number.isFinite(amount) || amount <= 0) return err("Invalid amount");
      if (body.direction !== "to_bank" && body.direction !== "to_wallet") return err("Invalid direction");
      const { data: existing } = await client.from(T.transactions).select("*").eq("idempotency_key", body.idempotency_key).maybeSingle();
      if (existing) return json(existing);
      const { data: fresh } = await client.from(T.users).select("*").eq("id", user.id).single();
      if (!fresh) return err("User not found", 404);
      let wallet = fresh.wallet_usd as number;
      let bank = fresh.bank_usd as number;
      if (body.direction === "to_bank") {
        if (wallet < amount) return err("Insufficient wallet balance");
        wallet -= amount; bank += amount;
      } else {
        if (bank < amount) return err("Insufficient bank balance");
        bank -= amount; wallet += amount;
      }
      const { error: uerr } = await client.from(T.users).update({ wallet_usd: wallet, bank_usd: bank, updated_at: new Date().toISOString() }).eq("id", user.id);
      if (uerr) return err(uerr.message, 500);
      const { data: tx, error } = await client.from(T.transactions).insert({
        user_id: user.id,
        type: body.direction === "to_bank" ? "BANK_DEPOSIT" : "BANK_WITHDRAW",
        amount_usd: amount, wallet_after: wallet, bank_after: bank,
        reason: body.direction === "to_bank" ? "Deposit to bank" : "Withdraw from bank",
        status: "completed", idempotency_key: body.idempotency_key,
      }).select("*").single();
      if (error) return err(error.message, 500);
      return json(tx);
    }

    if (req.method === "GET" && path === "/api/crash/state") {
      const { data: activeRow } = await client
        .from(T.crash_bets)
        .select("*, ma_crash_rounds(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      let justCrashed: { crash_multiplier: number } | null = null;
      let liveElapsed = 0;
      let liveMult = 1;
      if (activeRow?.ma_crash_rounds) {
        const settled = await settleIfCrashed(
          client,
          activeRow as Record<string, unknown>,
          activeRow.ma_crash_rounds as Record<string, unknown>,
        );
        liveElapsed = settled.elapsed_sec;
        liveMult = settled.server_multiplier;
        if (settled.crashed) justCrashed = { crash_multiplier: settled.crash_multiplier };
      }

      const { data: active } = justCrashed
        ? { data: null }
        : await client.from(T.crash_bets).select("*").eq("user_id", user.id).eq("status", "active").maybeSingle();

      const round = activeRow?.ma_crash_rounds && !justCrashed
        ? activeRow.ma_crash_rounds
        : await getOrCreateOpenRound(client);

      const { data: history } = await client
        .from(T.crash_rounds)
        .select("public_id,crash_multiplier_bp,status,crashed_at")
        .in("status", ["crashed", "settled"])
        .order("id", { ascending: false })
        .limit(10);

      return json({
        round: mapRound(round as Record<string, unknown>, Boolean(justCrashed)),
        active_bet: active
          ? {
              id: active.id,
              stake_usd: active.stake_usd,
              status: active.status,
              payout_usd: active.payout_usd,
              cashout_multiplier: active.cashout_multiplier_bp ? Number(active.cashout_multiplier_bp) / 100 : null,
              created_at: active.created_at,
              elapsed_sec: liveElapsed,
              server_multiplier: liveMult,
            }
          : null,
        just_crashed: justCrashed,
        growth_per_sec: CRASH_GROWTH_PER_SEC,
        server_now_ms: Date.now(),
        history: (history ?? []).map((h) => ({
          public_id: h.public_id,
          crash_multiplier: Number(h.crash_multiplier_bp) / 100,
          status: h.status,
          crashed_at: h.crashed_at,
        })),
      });
    }

    if (req.method === "POST" && path === "/api/crash/bet") {
      const body = postBody as { stake_usd?: number; client_seed?: string; idempotency_key?: string } | null;
      if (!body?.idempotency_key || body.stake_usd == null) return err("stake_usd and idempotency_key required");
      const stake = Math.floor(Number(body.stake_usd));
      if (!Number.isFinite(stake) || stake < CRASH_MIN) return err("Stake outside allowed limits");
      const { data: existing } = await client.from(T.crash_bets).select("*, ma_crash_rounds(*)").eq("idempotency_key", body.idempotency_key).maybeSingle();
      if (existing) {
        const exRound = (existing.ma_crash_rounds ?? {}) as Record<string, unknown>;
        const elapsed = existing.status === "active" ? flightElapsedSec(existing as Record<string, unknown>, exRound) : 0;
        return json({
          id: existing.id, stake_usd: existing.stake_usd, status: existing.status, created_at: existing.created_at,
          cashout_multiplier: existing.cashout_multiplier_bp ? Number(existing.cashout_multiplier_bp) / 100 : null,
          payout_usd: existing.payout_usd,
          elapsed_sec: elapsed,
          server_multiplier: growthBpFromElapsed(elapsed) / 100,
          growth_per_sec: CRASH_GROWTH_PER_SEC,
          round: mapRound(exRound, false),
        });
      }
      const { data: active } = await client.from(T.crash_bets).select("id").eq("user_id", user.id).eq("status", "active").maybeSingle();
      if (active) return err("You already have an active Crash bet");
      const { data: fresh } = await client.from(T.users).select("*").eq("id", user.id).single();
      if (!fresh) return err("User not found", 404);
      if (fresh.wallet_usd < stake) return err("Insufficient wallet balance");
      // Always open a fresh round for this stake so the flight clock starts at 1.00x.
      const serverSeed = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const cseed = (body.client_seed || crypto.randomUUID().replace(/-/g, "").slice(0, 16)).slice(0, 64);
      const startedAt = new Date().toISOString();
      const { data: round, error: roundErr } = await client.from(T.crash_rounds).insert({
        public_id: crypto.randomUUID(),
        server_seed_hash: await sha256Hex(serverSeed),
        server_seed: serverSeed,
        client_seed: cseed,
        nonce: 1,
        crash_multiplier_bp: await crashMultiplierBp(serverSeed, cseed, 1),
        status: "running",
        started_at: startedAt,
      }).select("*").single();
      if (roundErr || !round) return err(roundErr?.message ?? "Round create failed", 500);
      const wallet = fresh.wallet_usd - stake;
      await client.from(T.users).update({ wallet_usd: wallet, updated_at: new Date().toISOString() }).eq("id", user.id);
      await client.from(T.transactions).insert({
        user_id: user.id, type: "CRASH_BET", amount_usd: -stake, wallet_after: wallet, bank_after: fresh.bank_usd,
        reason: `Crash stake round ${round.public_id}`, status: "completed", idempotency_key: `crash-bet:${body.idempotency_key}`,
      });
      const { data: bet, error } = await client.from(T.crash_bets).insert({
        round_id: round.id, user_id: user.id, stake_usd: stake, status: "active", idempotency_key: body.idempotency_key,
      }).select("*").single();
      if (error) return err(error.message, 500);
      return json({
        id: bet.id, stake_usd: bet.stake_usd, status: bet.status, created_at: bet.created_at,
        cashout_multiplier: null, payout_usd: 0,
        // Client MUST start the visual clock at 1.00x from local now — do not Date.parse timestamps.
        elapsed_sec: 0,
        server_multiplier: 1,
        growth_per_sec: CRASH_GROWTH_PER_SEC,
        round: mapRound(round as Record<string, unknown>, false),
      });
    }

    if (req.method === "POST" && path === "/api/crash/cashout") {
      const body = postBody as {
        multiplier?: number;
        displayed_multiplier?: number;
        bet_id?: number;
        idempotency_key?: string;
      } | null;
      if (!body?.idempotency_key) return err("idempotency_key required");
      let betQuery = client.from(T.crash_bets).select("*, ma_crash_rounds(*)").eq("user_id", user.id).eq("status", "active");
      if (body.bet_id != null) betQuery = betQuery.eq("id", body.bet_id);
      const { data: bet } = await betQuery.maybeSingle();
      if (!bet) return err("No active bet", 404);
      const round = bet.ma_crash_rounds as Record<string, unknown>;
      const crashBp = Number(round.crash_multiplier_bp);
      // Flight clock starts at THIS round's started_at (set when the bet is placed).
      const elapsed = flightElapsedSec(bet as Record<string, unknown>, round);
      let multBp = Math.min(growthBpFromElapsed(elapsed), crashBp);
      const clientMult = body.displayed_multiplier ?? body.multiplier;
      if (clientMult != null && Number.isFinite(Number(clientMult))) {
        multBp = Math.min(multBp, Math.round(Number(clientMult) * 100));
      }
      if (multBp < 101 || multBp >= crashBp) {
        await client.from(T.crash_bets).update({ status: "lost", settled_at: new Date().toISOString(), payout_usd: 0 }).eq("id", bet.id);
        await client.from(T.crash_rounds).update({ status: "crashed", crashed_at: new Date().toISOString() }).eq("id", round.id);
        return err("Crashed before cash out");
      }
      const payout = Math.floor((bet.stake_usd * multBp) / 100);
      const { data: fresh } = await client.from(T.users).select("*").eq("id", user.id).single();
      if (!fresh) return err("User not found", 404);
      const wallet = fresh.wallet_usd + payout;
      await client.from(T.users).update({ wallet_usd: wallet, updated_at: new Date().toISOString() }).eq("id", user.id);
      await client.from(T.transactions).insert({
        user_id: user.id, type: "CRASH_WIN", amount_usd: payout, wallet_after: wallet, bank_after: fresh.bank_usd,
        reason: `Crash cashout ${multBp / 100}x`, status: "completed", idempotency_key: `crash-cashout:${body.idempotency_key}`,
      });
      const { data: updated } = await client.from(T.crash_bets).update({
        status: "won", cashout_multiplier_bp: multBp, payout_usd: payout, settled_at: new Date().toISOString(),
      }).eq("id", bet.id).select("*").single();
      await client.from(T.crash_rounds).update({ status: "settled", crashed_at: new Date().toISOString() }).eq("id", round.id);
      return json({ id: updated?.id ?? bet.id, stake_usd: bet.stake_usd, status: "won", cashout_multiplier: multBp / 100, payout_usd: payout, round: mapRound(round, false) });
    }

    if (req.method === "POST" && path === "/api/promos/redeem") {
      const body = postBody as { code?: string } | null;
      const code = (body?.code ?? "").trim().toUpperCase();
      if (!code) return err("code required");
      const { data: promo } = await client.from(T.promo_codes).select("*").eq("code", code).eq("is_active", true).maybeSingle();
      if (!promo) return err("Promo not found", 404);
      if (promo.max_total != null && promo.used_total >= promo.max_total) return err("Promo exhausted");
      const { data: prior } = await client.from(T.promo_redemptions).select("id").eq("promo_id", promo.id).eq("user_id", user.id).maybeSingle();
      if (prior) return err("Already redeemed");
      let rewardUsd = 0;
      try {
        const payload = JSON.parse(promo.reward_payload);
        rewardUsd = Math.floor(Number(payload.usd ?? payload.amount_usd ?? 0));
      } catch {
        return err("Invalid promo payload", 500);
      }
      if (promo.reward_type !== "usd" || rewardUsd <= 0) return err("Unsupported promo");
      const { data: fresh } = await client.from(T.users).select("*").eq("id", user.id).single();
      if (!fresh) return err("User not found", 404);
      const wallet = fresh.wallet_usd + rewardUsd;
      await client.from(T.users).update({ wallet_usd: wallet, updated_at: new Date().toISOString() }).eq("id", user.id);
      await client.from(T.promo_redemptions).insert({ promo_id: promo.id, user_id: user.id });
      await client.from(T.promo_codes).update({ used_total: promo.used_total + 1 }).eq("id", promo.id);
      await client.from(T.transactions).insert({
        user_id: user.id, type: "PROMO", amount_usd: rewardUsd, wallet_after: wallet, bank_after: fresh.bank_usd,
        reason: `Promo ${code}`, status: "completed", idempotency_key: `promo:${promo.id}:${user.id}`,
      });
      return json({ ok: true, reward_usd: rewardUsd, wallet_usd: wallet });
    }

    if (req.method === "GET" && path === "/api/admin/dashboard") {
      if (!user.is_admin) return err("Forbidden", 403);
      const { count } = await client.from(T.users).select("*", { count: "exact", head: true });
      return json({ players_total: count ?? 0, service: "bayhan-miniapp-v2" });
    }

    return err("Not found", 404);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
});
