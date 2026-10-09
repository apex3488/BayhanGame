"use client";

import Link from "next/link";
import { DemoChip } from "@/components/layout/demo-notice";
import { PageHeader } from "@/components/layout/page-header";
import { CITY_GROUPS, CITY_SECTIONS } from "@/lib/city/sections";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useGameApi } from "@/lib/state/game-api-context";
import { haptic } from "@/lib/telegram/webapp";

export function CityHubScreen() {
  const { t } = useI18n();
  const { isDemo } = useGameApi();

  return (
    <div className="space-y-6">
      <PageHeader title={t.city.title} subtitle={t.city.subtitle} actions={<DemoChip />} />
      {isDemo ? (
        <p className="rounded-2xl border border-brand-400/25 bg-brand-500/10 px-3.5 py-2.5 text-[12.5px] text-mist-300">{t.city.demoNote}</p>
      ) : (
        <p className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[12.5px] text-mist-300">{t.city.liveBotOnly}</p>
      )}

      {CITY_GROUPS.map((group) => {
        const items = CITY_SECTIONS.filter((section) => section.group === group.id);
        return (
          <section key={group.id} className="space-y-2.5 animate-fade-up">
            <h2 className="px-1 text-[13px] font-semibold tracking-[0.08em] text-mist-500 uppercase">{group.title(t)}</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {items.map((section) => {
                const Icon = section.icon;
                return (
                  <Link
                    key={section.id}
                    href={section.href}
                    onClick={() => haptic.impact("light")}
                    className="press surface-raised flex flex-col gap-2 p-3.5"
                  >
                    <span className="grid size-10 place-items-center rounded-xl border border-brand-400/25 bg-brand-500/10 text-brand-200">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="text-[14px] font-semibold text-white">{section.label(t)}</span>
                    <span className="text-[11.5px] leading-snug text-mist-500">{section.hint(t)}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
