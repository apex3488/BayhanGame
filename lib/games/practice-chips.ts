"use client";

import { useSyncExternalStore } from "react";

/** Practice chips are a separate, in-memory counter. They are never sent to any backend. */
export const PRACTICE_START = 10_000;
export const MIN_BET = 100;

let chips = PRACTICE_START;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export const practiceChips = {
  get: () => chips,
  add(amount: number) {
    chips = Math.max(0, Math.round(chips + amount));
    emit();
  },
  reset() {
    chips = PRACTICE_START;
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function usePracticeChips(): number {
  return useSyncExternalStore(practiceChips.subscribe, practiceChips.get, () => PRACTICE_START);
}
