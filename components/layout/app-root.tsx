
"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { createGameApi } from "@/lib/api/data-source";
import { DEFAULT_LOCALE, isLocale, LOCALE_STORAGE_KEY, matchLocale } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/i18n-provider";
import { loadPreferences, PreferencesProvider } from "@/lib/preferences/preferences-provider";
import { GameApiProvider } from "@/lib/state/game-api-context";
import { invalidateResources } from "@/lib/state/resource-store";
import { TelegramProvider } from "@/lib/telegram/telegram-provider";
import { activateTelegram, readTelegramSession } from "@/lib/telegram/webapp";
import { readStorage } from "@/lib/utils/storage";
import type { Locale } from "@/types/game";
import { AppShell } from "./app-shell";
import { SplashScreen } from "./splash-screen";

/** Drop cached player/API reads when Telegram auth or GameApi adapter changes. */
function invalidateLiveCaches(): void {
  invalidateResources("player:");
  invalidateResources("activity:");
  invalidateResources("tasks:");
  invalidateResources("catalog:");
  invalidateResources("inventory");
  invalidateResources("leaderboard:");
}

const noopSubscribe = () => () => {};

function bootstrap() {
  const session = readTelegramSession();
  const stored = readStorage(LOCALE_STORAGE_KEY);
  const locale: Locale = isLocale(stored)
    ? stored
    : (matchLocale(session.user?.language_code) ?? DEFAULT_LOCALE);

  return {
    session,
    locale,
    preferences: loadPreferences(),
    ...createGameApi(session),
  };
}

function ClientApp({ children }: { children: ReactNode }) {
  const [boot, setBoot] = useState(bootstrap);

  useEffect(() => {
    const syncTelegramSession = () => {
      const session = readTelegramSession();

      if (session.status !== "telegram" || !session.initData) {
        return;
      }

      activateTelegram();

      setBoot((current) => {
        if (
          current.session.status === "telegram" &&
          current.session.initData === session.initData
        ) {
          return current;
        }

        // HomeHeader calls usePlayer even while unavailable; an early unauthorized
        // result must not stick after initData arrives and the live API is wired.
        invalidateLiveCaches();

        return {
          ...current,
          session,
          ...createGameApi(session),
        };
      });
    };

    syncTelegramSession();

    const intervalId = window.setInterval(syncTelegramSession, 500);
    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
    }, 10000);

    document.addEventListener("visibilitychange", syncTelegramSession);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", syncTelegramSession);
    };
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

export function AppRoot({ children }: { children: ReactNode }) {
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  return isClient ? <ClientApp>{children}</ClientApp> : <SplashScreen />;
}
