export type ApiErrorCode =
  | "not_configured"
  | "unauthorized"
  | "insufficient_funds"
  | "already_owned"
  | "not_owned"
  | "not_purchasable"
  | "sold_out"
  | "cooldown"
  | "not_completed"
  | "already_claimed"
  | "not_found"
  | "network"
  | "invalid_response"
  | "unknown";

export interface ApiError {
  code: ApiErrorCode;
  /** Developer-facing detail. Never shown verbatim to players. */
  detail?: string;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(code: ApiErrorCode, detail?: string): ApiResult<T> {
  return { ok: false, error: { code, detail } };
}

const KNOWN_CODES: ReadonlySet<string> = new Set<ApiErrorCode>([
  "not_configured",
  "unauthorized",
  "insufficient_funds",
  "already_owned",
  "not_owned",
  "not_purchasable",
  "sold_out",
  "cooldown",
  "not_completed",
  "already_claimed",
  "not_found",
  "network",
  "invalid_response",
  "unknown",
]);

export function toErrorCode(value: unknown): ApiErrorCode {
  return typeof value === "string" && KNOWN_CODES.has(value) ? (value as ApiErrorCode) : "unknown";
}
