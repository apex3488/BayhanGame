"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { getWebApp, type TelegramSession } from "./webapp";

const TelegramContext = createContext<TelegramSession | null>(null);

export function TelegramProvider({ session, children }: { session: TelegramSession; children: ReactNode }) {
  return <TelegramContext.Provider value={session}>{children}</TelegramContext.Provider>;
}

export function useTelegram(): TelegramSession {
  const value = useContext(TelegramContext);
  if (!value) throw new Error("useTelegram must be used inside <TelegramProvider>");
  return value;
}

/**
 * Show Telegram's native BackButton while the component is mounted.
 * Outside Telegram this is a no-op; screens render their own back link instead.
 */
export function useTelegramBackButton(onBack: () => void): void {
  const handlerRef = useRef(onBack);

  useEffect(() => {
    handlerRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    const webApp = getWebApp();
    const button = webApp?.initData && webApp.isVersionAtLeast("6.1") ? webApp.BackButton : undefined;
    if (!button) return;

    const handle = () => handlerRef.current();
    try {
      button.onClick(handle);
      button.show();
    } catch {
      return;
    }
    return () => {
      try {
        button.offClick(handle);
        button.hide();
      } catch {
        /* SDK torn down */
      }
    };
  }, []);
}
