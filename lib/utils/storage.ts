/** localStorage access that never throws (private mode, disabled storage, SSR). */

export function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — preference stays in memory only */
  }
}

export function readJson<T>(key: string, guard: (value: unknown) => value is T): T | null {
  const text = readStorage(key);
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
