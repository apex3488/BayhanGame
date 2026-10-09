export type ApiErrorCode =
  | "not_configured"
  | "unauthorized"
  | "forbidden"
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

export type ApiFailureStage =
  | "no_init_data"
  | "network"
  | "http"
  | "parse"
  | "map"
  | "ok";

export interface ApiError {
  code: ApiErrorCode;
  /** Developer-facing detail. Never shown verbatim to players. */
  detail?: string;
  /** Safe HTTP status when the failure came from a response (never includes bodies/secrets). */
  httpStatus?: number;
  /** Coarse stage for diagnostics UI. */
  stage?: ApiFailureStage;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  code: ApiErrorCode,
  detail?: string,
  meta?: { httpStatus?: number; stage?: ApiFailureStage },
): ApiResult<T> {
  return {
    ok: false,
    error: {
      code,
      detail,
      httpStatus: meta?.httpStatus,
      stage: meta?.stage,
    },
  };
}

const KNOWN_CODES: ReadonlySet<string> = new Set<ApiErrorCode>([
  "not_configured",
  "unauthorized",
  "forbidden",
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
