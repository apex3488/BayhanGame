import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/config/env";
import type { Database } from "./types";

export type SupabaseConfigStatus =
  | { state: "not_configured" }
  | { state: "unsafe_key" }
  | { state: "configured"; host: string };

function decodeJwtRole(token: string): string | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json: unknown = JSON.parse(atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")));
    return typeof json === "object" && json !== null && "role" in json && typeof json.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

/** Reject anything that is not a public key, so a misconfigured secret never gets used from the browser. */
function isPublicKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return false;
  if (key.startsWith("sb_publishable_")) return true;
  const role = decodeJwtRole(key);
  return role === null || role === "anon";
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return { state: "not_configured" };
  if (!isPublicKey(env.supabaseAnonKey)) return { state: "unsafe_key" };
  return { state: "configured", host: new URL(env.supabaseUrl).host };
}

let client: SupabaseClient<Database> | null = null;

/** Lazily created browser client, or null when Supabase is not (safely) configured. */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (getSupabaseConfigStatus().state !== "configured" || !env.supabaseUrl || !env.supabaseAnonKey) return null;
  if (!client) {
    client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}

export function getSupabaseFunctionUrl(): string | null {
  if (!env.supabaseUrl || getSupabaseConfigStatus().state !== "configured") return null;
  return `${env.supabaseUrl}/functions/v1/${encodeURIComponent(env.supabaseFunctionName)}`;
}

export type ConnectionCheck = { ok: true } | { ok: false; reason: string };

/** Lightweight reachability probe for the diagnostics screen. Never exposes keys. */
export async function checkSupabaseConnection(): Promise<ConnectionCheck> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, reason: "not_configured" };
  try {
    const { error } = await supabase.from("store_items").select("id", { count: "exact", head: true });
    if (!error) return { ok: true };
    if (error.code === "PGRST205" || error.code === "42P01") return { ok: false, reason: "schema_missing" };
    return { ok: false, reason: error.code || "request_failed" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
