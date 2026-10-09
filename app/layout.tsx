import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { AppRoot } from "@/components/layout/app-root";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BAYHAN GAME",
    template: "%s · BAYHAN GAME",
  },
  description: "BAYHAN GAME — Telegram Mini App by BAYHAN STUDIO",
  applicationName: "BAYHAN GAME",
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#05070B",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <AppRoot>{children}</AppRoot>
      </body>
    </html>
  );
}
