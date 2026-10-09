import { env } from "@/lib/config/env";

export type GameApiConnectionCheck =
  | { ok: true; host: string }
  | { ok: false; reason: string; host?: string };

/**
 * Reachability probe for Settings → Diagnostics.
 * Calls only GET /health — never sends initData or secrets.
 */
export async function checkGameApiConnection(timeoutMs = 8_000): Promise<GameApiConnectionCheck> {
  const baseUrl = env.gameApiUrl;
  if (!baseUrl) return { ok: false, reason: "not_configured" };

  let host: string;
  try {
    host = new URL(baseUrl).host;
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      credentials: "omit",
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, reason: `http_${response.status}`, host };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, reason: "invalid_json", host };
    }

    if (
      typeof payload === "object" &&
      payload !== null &&
      "status" in payload &&
      (payload as { status: unknown }).status === "ok"
    ) {
      return { ok: true, host };
    }

    return { ok: false, reason: "unexpected_body", host };
  } catch (error) {
    const aborted =
      (typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError");
    if (aborted) return { ok: false, reason: "timeout", host };
    return { ok: false, reason: "network", host };
  } finally {
    clearTimeout(timer);
  }
}
