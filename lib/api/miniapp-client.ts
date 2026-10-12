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

export async function miniappFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const root = apiRoot();
  const token = getAccessToken();

  if (isSupabaseFunction(root) && env.supabaseAnonKey) {
    // Gateway expects a Supabase anon JWT in Authorization / apikey.
    // Our session JWT must NOT go there — it causes CORS-blocked 401s ("Network error").
    headers.set("apikey", env.supabaseAnonKey);
    headers.set("Authorization", `Bearer ${env.supabaseAnonKey}`);
    if (token) headers.set("X-Bayhan-Token", token);
  } else if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${root}${path}`, { ...init, headers, credentials: "omit" });
  } catch {
    throw new MiniappApiError(0, "Network error");
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
