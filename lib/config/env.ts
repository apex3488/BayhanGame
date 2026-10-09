import type { DataSourceKind } from "@/lib/api/game-api";

/**
 * Public, build-time configuration. Next.js inlines only literal
 * `process.env.NEXT_PUBLIC_*` reads, so each variable is referenced explicitly.
 */
const raw = {
  botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
  dataSource: process.env.NEXT_PUBLIC_DATA_SOURCE,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseFunctionName: process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_NAME,
  gameApiUrl: process.env.NEXT_PUBLIC_GAME_API_URL,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
};

const BOT_USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

function parseBotUsername(value: string | undefined): string | null {
  const name = clean(value).replace(/^@/, "");
  return BOT_USERNAME_RE.test(name) ? name : null;
}

function parseHttpUrl(value: string | undefined): string | null {
  const text = clean(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function parseDataSource(value: string | undefined): DataSourceKind {
  const text = clean(value).toLowerCase();
  return text === "supabase" || text === "api" ? text : "demo";
}

export const env = {
  botUsername: parseBotUsername(raw.botUsername),
  botUsernameProvided: clean(raw.botUsername).length > 0,
  dataSource: parseDataSource(raw.dataSource),
  supabaseUrl: parseHttpUrl(raw.supabaseUrl),
  supabaseAnonKey: clean(raw.supabaseAnonKey) || null,
  supabaseFunctionName: clean(raw.supabaseFunctionName) || "miniapp-api",
  gameApiUrl: parseHttpUrl(raw.gameApiUrl),
  basePath: clean(raw.basePath),
  appVersion: clean(raw.appVersion) || "0.0.0",
} as const;

export function botUrl(): string | null {
  return env.botUsername ? `https://t.me/${env.botUsername}` : null;
}

/** Prefix a path inside /public with the deployment base path (GitHub Pages subpath). */
export function assetPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${env.basePath}${normalized}`;
}
