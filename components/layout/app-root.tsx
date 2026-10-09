"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { createGameApi } from "@/lib/api/data-source";
import { DEFAULT_LOCALE, isLocale, LOCALE_STORAGE_KEY, matchLocale } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/i18n-provider";
import { loadPreferences, PreferencesProvider } from "@/lib/preferences/preferences-provider";
import { GameApiProvider } from "@/lib/state/game-api-context";
import { TelegramProvider } from "@/lib/telegram/telegram-provider";
import { activateTelegram, readTelegramSession } from "@/lib/telegram/webapp";
import { readStorage } from "@/lib/utils/storage";
import type { Locale } from "@/types/game";
import { AppShell } from "./app-shell";
import { SplashScreen } from "./splash-screen";

const noopSubscribe = () => () => {};

function bootstrap() {
  const session = readTelegramSession();
  const stored = readStorage(LOCALE_STORAGE_KEY);
  const locale: Locale = isLocale(stored) ? stored : (matchLocale(session.user?.language_code) ?? DEFAULT_LOCALE);
  return { session, locale, preferences: loadPreferences(), ...createGameApi(session) };
}

function ClientApp({ children }: { children: ReactNode }) {
  const [boot] = useState(bootstrap);

  useEffect(() => {
    activateTelegram();
  }, []);

  return (
    <TelegramProvider session={boot.session}>
      <PreferencesProvider initial={boot.preferences}>
        <I18nProvider initialLocale={boot.locale}>
          <GameApiProvider api={boot.api} source={boot.state}>
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </GameApiProvider>
        </I18nProvider>
      </PreferencesProvider>
    </TelegramProvider>
  );
}

/**
 * The static HTML only contains the splash screen. Everything that depends on the
 * browser (Telegram SDK, localStorage, language) is read after hydration, which keeps
 * server and client markup identical and avoids hydration mismatches.
 */
export function AppRoot({ children }: { children: ReactNode }) {
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return isClient ? <ClientApp>{children}</ClientApp> : <SplashScreen />;
}
