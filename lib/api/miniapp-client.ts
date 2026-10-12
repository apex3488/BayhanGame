import { env } from "@/lib/config/env";
import { clearAccessToken, getAccessToken } from "@/lib/auth/session";

export class MiniappApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "MiniappApiError";
  }
}

function apiRoot(): string {
  const base = env.gameApiUrl;
  if (!base) throw new MiniappApiError(0, "NEXT_PUBLIC_GAME_API_URL is not configured");
  return base.replace(/\/+$/, "");
}

function isSupabaseFunction(url: string): boolean {
  return url.includes(".supabase.co/functions/");
}

/**
 * Telegram WebViews sometimes drop uncommon headers. We send the session
 * token in several places the Edge Function accepts.
 */
function applySessionToken(headers: Headers, url: URL, token: string | null, method: string) {
  if (!token) return;
  headers.set("X-Bayhan-Token", token);
  headers.set("x-access-token", token);
  // Some Android WebViews keep this even when custom X-* are stripped.
  headers.set("X-Authorization", `Bearer ${token}`);
  if (method === "GET" || method === "HEAD") {
    url.searchParams.set("access_token", token);
  }
}

export async function miniappFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const root = apiRoot();
  const token = getAccessToken();
  const method = (init.method ?? "GET").toUpperCase();
  const url = new URL(path.startsWith("http") ? path : `${root}${path.startsWith("/") ? path : `/${path}`}`);

  if (isSupabaseFunction(root) && env.supabaseAnonKey) {
    // Prefer anon JWT for the Supabase gateway. Custom session JWT stays in
    // X-Bayhan-Token / query / body — never replace Authorization with it when
    // verify_jwt is on (Telegram WebViews + CORS "Network error").
    headers.set("apikey", env.supabaseAnonKey);
    headers.set("Authorization", `Bearer ${env.supabaseAnonKey}`);
    applySessionToken(headers, url, token, method);
  } else if (isSupabaseFunction(root)) {
    // Missing anon key — still try; edge has verify_jwt=false for bayhan-api.
    applySessionToken(headers, url, token, method);
    if (token) headers.set("Authorization", `Bearer ${token}`);
  } else if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // For POST/PUT, also embed token in JSON body when possible (Telegram-safe).
  let body = init.body;
  if (token && body && typeof body === "string" && method !== "GET" && method !== "HEAD") {
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.access_token == null) {
        parsed.access_token = token;
        body = JSON.stringify(parsed);
      }
    } catch {
      // non-JSON body — leave as-is
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), { ...init, method, headers, body, credentials: "omit" });
  } catch (cause) {
    const hint =
      typeof cause === "object" && cause && "message" in cause
        ? String((cause as { message: unknown }).message)
        : "";
    throw new MiniappApiError(0, hint.includes("Failed to fetch") || !hint ? "Network error" : hint);
  }

  if (response.status === 401) {
    clearAccessToken();
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }

  if (!response.ok) {
    const detail =
      typeof data === "object" && data && "detail" in data && typeof (data as { detail: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `HTTP ${response.status}`;
    throw new MiniappApiError(response.status, detail);
  }

  return data as T;
}

export interface MiniappUser {
  id: number;
  login: string;
  display_name: string;
  is_admin: boolean;
  wallet_usd: number;
  bank_usd: number;
  level: number;
  xp: number;
  created_at: string;
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().replace(/-/g, "");
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}
