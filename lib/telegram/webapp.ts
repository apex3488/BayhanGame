import type {
  HapticImpactStyle,
  HapticNotificationType,
  TelegramWebApp,
  TelegramWebAppUser,
} from "./types";

export type TelegramStatus = "telegram" | "browser" | "sdk_missing";

export interface TelegramSession {
  status: TelegramStatus;
  /** Raw signed initData. Forward it to the backend for verification; never trust it client-side. */
  initData: string;
  /** Display-only user data from initDataUnsafe. */
  user: TelegramWebAppUser | null;
  platform: string | null;
  version: string | null;
  colorScheme: "light" | "dark" | null;
  startParam: string | null;
}

export const BROWSER_SESSION: TelegramSession = {
  status: "browser",
  initData: "",
  user: null,
  platform: null,
  version: null,
  colorScheme: null,
  startParam: null,
};

const APP_BACKGROUND = "#05070B";

export function getWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

function supports(webApp: TelegramWebApp, version: string): boolean {
  try {
    return webApp.isVersionAtLeast(version);
  } catch {
    return false;
  }
}

function safeCall(action: () => void): void {
  try {
    action();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.warn("[telegram]", error);
  }
}

function isValidUser(value: unknown): value is TelegramWebAppUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<TelegramWebAppUser>;
  return typeof user.id === "number" && Number.isFinite(user.id) && typeof user.first_name === "string";
}

/**
 * Read the current Telegram session without side effects. Safe in any browser.
 * The SDK script also loads in ordinary browsers, so "inside Telegram" is detected
 * by the presence of signed initData rather than by the SDK object alone.
 */
export function readTelegramSession(): TelegramSession {
  const webApp = getWebApp();
  if (!webApp) return { ...BROWSER_SESSION, status: "sdk_missing" };

  const initData = typeof webApp.initData === "string" ? webApp.initData : "";
  if (!initData) return { ...BROWSER_SESSION, platform: webApp.platform ?? null, version: webApp.version ?? null };

  const unsafeUser = webApp.initDataUnsafe?.user;
  return {
    status: "telegram",
    initData,
    user: isValidUser(unsafeUser) ? unsafeUser : null,
    platform: webApp.platform ?? null,
    version: webApp.version ?? null,
    colorScheme: webApp.colorScheme ?? null,
    startParam: webApp.initDataUnsafe?.start_param ?? null,
  };
}

/** Tell Telegram the app is ready, expand it and match the native chrome to the app background. */
export function activateTelegram(): void {
  const webApp = getWebApp();
  if (!webApp?.initData) return;

  safeCall(() => webApp.ready());
  safeCall(() => webApp.expand());
  if (supports(webApp, "6.1")) {
    safeCall(() => webApp.setHeaderColor?.(APP_BACKGROUND));
    safeCall(() => webApp.setBackgroundColor?.(APP_BACKGROUND));
  }
  if (supports(webApp, "7.10")) safeCall(() => webApp.setBottomBarColor?.(APP_BACKGROUND));
  if (supports(webApp, "7.7")) safeCall(() => webApp.disableVerticalSwipes?.());
}

let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

function haptics() {
  if (!hapticsEnabled) return null;
  const webApp = getWebApp();
  if (!webApp?.initData || !supports(webApp, "6.1")) return null;
  return webApp.HapticFeedback ?? null;
}

export const haptic = {
  impact(style: HapticImpactStyle = "light") {
    const h = haptics();
    if (h) safeCall(() => h.impactOccurred(style));
  },
  notify(type: HapticNotificationType) {
    const h = haptics();
    if (h) safeCall(() => h.notificationOccurred(type));
  },
  selection() {
    const h = haptics();
    if (h) safeCall(() => h.selectionChanged());
  },
};

/** Open a t.me link: natively inside Telegram, in a new tab otherwise. */
export function openTelegramUrl(url: string): void {
  const webApp = getWebApp();
  if (webApp?.initData) {
    safeCall(() => webApp.openTelegramLink(url));
    return;
  }
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
}
