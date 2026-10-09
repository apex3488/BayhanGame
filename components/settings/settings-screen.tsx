"use client";

import { ArrowUpRight, Info } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { SwitchRow } from "@/components/ui/controls";
import { botUrl, env } from "@/lib/config/env";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { usePreferences } from "@/lib/preferences/preferences-provider";
import { openTelegramUrl } from "@/lib/telegram/webapp";
import { DiagnosticsPanel } from "./diagnostics-panel";
import { LanguageSwitcher } from "./language-switcher";

export function SettingsScreen() {
  const { t } = useI18n();
  const { preferences, setPreference } = usePreferences();
  const url = botUrl();

  return (
    <div className="space-y-6">
      <PageHeader title={t.settings.title} backHref="/profile" />

      <Section id="settings-language" title={t.settings.language}>
        <LanguageSwitcher />
      </Section>

      <Section id="settings-display" title={t.settings.display}>
        <Card className="divide-y divide-white/[0.05] px-4">
          <SwitchRow
            label={t.settings.reduceMotion}
            description={t.settings.reduceMotionHint}
            checked={preferences.reduceMotion}
            onChange={(value) => setPreference("reduceMotion", value)}
          />
          <SwitchRow
            label={t.settings.haptics}
            description={t.settings.hapticsHint}
            checked={preferences.haptics}
            onChange={(value) => setPreference("haptics", value)}
          />
          <SwitchRow
            label={t.settings.compactNumbers}
            description={t.settings.compactNumbersHint}
            checked={preferences.compactNumbers}
            onChange={(value) => setPreference("compactNumbers", value)}
          />
        </Card>
      </Section>

      <Section id="settings-about" title={t.settings.about}>
        <Card className="space-y-4 p-4">
          <div className="flex items-center gap-3">
            <LogoMark size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold tracking-wide">BAYHAN GAME</p>
              <p className="text-[12px] text-mist-500">
                {t.settings.version} {env.appVersion}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-3.5">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-brand-300">{t.settings.studio}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-mist-300">{t.settings.studioText}</p>
          </div>
          <Button
            block
            disabled={!url}
            onClick={() => url && openTelegramUrl(url)}
            icon={<ArrowUpRight className="size-4" aria-hidden />}
          >
            {t.settings.backToBot}
          </Button>
          {!url && (
            <p className="flex items-start gap-2 text-[12px] text-mist-500">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {env.botUsernameProvided ? t.settings.botInvalid : t.settings.botNotConfigured}
            </p>
          )}
        </Card>
      </Section>

      <Section id="settings-diagnostics" title={t.settings.diagnostics}>
        <DiagnosticsPanel />
      </Section>
    </div>
  );
}
