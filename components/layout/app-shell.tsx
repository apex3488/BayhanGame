"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { BottomNav } from "./bottom-nav";
import { SideNav } from "./side-nav";

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-lg focus:bg-brand-500 focus:px-3 focus:py-2 focus:text-sm"
      >
        {t.nav.skipToContent}
      </a>
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl">
        <SideNav />
        <main id="main" className="min-w-0 flex-1 px-4 pt-safe pb-nav sm:px-6 md:px-10 md:pt-10 md:pb-12">
          <div className="mx-auto w-full max-w-xl md:max-w-3xl">{children}</div>
        </main>
      </div>
      <BottomNav />
    </>
  );
}
