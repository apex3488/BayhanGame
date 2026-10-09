import type { ApiErrorCode, ApiFailureStage } from "./result";

/**
 * Safe, in-memory snapshot of the last GET /api/me attempt.
 * Never stores initData, tokens, cookies, or response bodies.
 */
export interface ProfileLoadDiagnostic {
  at: number;
  hasInitData: boolean;
  stage: ApiFailureStage;
  httpStatus: number | null;
  code: ApiErrorCode | null;
  apiHost: string | null;
}

let last: ProfileLoadDiagnostic | null = null;

export function recordProfileLoadDiagnostic(entry: ProfileLoadDiagnostic): void {
  last = entry;
}

export function getLastProfileLoadDiagnostic(): ProfileLoadDiagnostic | null {
  return last;
}

/** Test helper — not used by the UI. */
export function resetProfileLoadDiagnostic(): void {
  last = null;
}
