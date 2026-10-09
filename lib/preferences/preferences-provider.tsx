"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setHapticsEnabled } from "@/lib/telegram/webapp";
import { readJson, writeStorage } from "@/lib/utils/storage";

export interface Preferences {
  reduceMotion: boolean;
  haptics: boolean;
  compactNumbers: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  reduceMotion: false,
  haptics: true,
  compactNumbers: false,
};

const STORAGE_KEY = "bayhan.preferences";

function isPreferences(value: unknown): value is Partial<Preferences> {
  return typeof value === "object" && value !== null;
}

export function loadPreferences(): Preferences {
  const stored = readJson(STORAGE_KEY, isPreferences) ?? {};
  return {
    reduceMotion: typeof stored.reduceMotion === "boolean" ? stored.reduceMotion : DEFAULT_PREFERENCES.reduceMotion,
    haptics: typeof stored.haptics === "boolean" ? stored.haptics : DEFAULT_PREFERENCES.haptics,
    compactNumbers:
      typeof stored.compactNumbers === "boolean" ? stored.compactNumbers : DEFAULT_PREFERENCES.compactNumbers,
  };
}

interface PreferencesValue {
  preferences: Preferences;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ initial, children }: { initial: Preferences; children: ReactNode }) {
  const [preferences, setPreferences] = useState(initial);

  useEffect(() => {
    setHapticsEnabled(preferences.haptics);
    document.documentElement.dataset.reduceMotion = preferences.reduceMotion ? "true" : "false";
    writeStorage(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const setPreference = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  }, []);

  const value = useMemo(() => ({ preferences, setPreference }), [preferences, setPreference]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences must be used inside <PreferencesProvider>");
  return value;
}
