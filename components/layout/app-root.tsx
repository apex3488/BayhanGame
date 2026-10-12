"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { AuthScreen } from "@/components/auth/auth-screen";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider, useAuth } from "@/lib/auth/auth-provider";
import { createDemoGameApi } from "@/lib/demo/demo-game-api";
import { setDemoSandboxEnabled } from "@/lib/demo/sandbox-gate";
import { DEFAULT_LOCALE, isLocale, LOCALE_STORAGE_KEY } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/i18n-provider";
import { loadPreferences, PreferencesProvider } from "@/lib/preferences/preferences-provider";
import { GameApiProvider } from "@/lib/state/game-api-context";
import { TelegramProvider } from "@/lib/telegram/telegram-provider";
import { BROWSER_SESSION } from "@/lib/telegram/webapp";
import { readStorage } from "@/lib/utils/storage";
import type { Locale } from "@/types/game";
import { AppShell } from "./app-shell";
import { SplashScreen } from "./splash-screen";

const noopSubscribe = () => () => {};

function AuthedShell({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const stored = readStorage(LOCALE_STORAGE_KEY);
  const locale: Locale = isLocale(stored) ? stored : DEFAULT_LOCALE;

  // Legacy GameApi (city/store demos) stays in explicit demo sandbox for non-critical UI.
  // Real wallet/Crash/auth use the independent Mini App API via AuthProvider.
  setDemoSandboxEnabled(true);
  const demoApi = createDemoGameApi(null);

  if (status === "loading") return <SplashScreen />;
  if (status !== "authenticated") {
    return (
      <I18nProvider initialLocale={locale}>
        <ToastProvider>
          <AuthScreen />
        </ToastProvider>
      </I18nProvider>
    );
  }

  return (
    <TelegramProvider session={BROWSER_SESSION}>
      <PreferencesProvider initial={loadPreferences()}>
        <I18nProvider initialLocale={locale}>
          <GameApiProvider
            api={demoApi}
            source={{ requested: "api", active: "api", isDemo: false, blockReason: null }}
          >
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </GameApiProvider>
        </I18nProvider>
      </PreferencesProvider>
    </TelegramProvider>
  );
}

export function AppRoot({ children }: { children: ReactNode }) {
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  if (!isClient) return <SplashScreen />;

  return (
    <AuthProvider>
      <AuthedShell>{children}</AuthedShell>
    </AuthProvider>
  );
}
