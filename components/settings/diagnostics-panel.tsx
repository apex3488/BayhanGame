"use client";

import { useState, type ReactNode } from "react";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { checkGameApiConnection, type GameApiConnectionCheck } from "@/lib/api/check-game-api";
import { env } from "@/lib/config/env";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useGameApi } from "@/lib/state/game-api-context";
import { checkSupabaseConnection, getSupabaseConfigStatus, type ConnectionCheck } from "@/lib/supabase/client";
import { useTelegram } from "@/lib/telegram/telegram-provider";
import { cn } from "@/lib/utils/cn";

function Row({ label, value, tone = "neutral" }: { label: string; value: ReactNode; tone?: "ok" | "neutral" | "muted" }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-[13px]">
      <dt className="text-mist-300">{label}</dt>
      <dd className={cn("min-w-0 truncate text-right font-medium", tone === "ok" && "text-brand-200", tone === "muted" && "text-mist-500")}>
        {value}
      </dd>
    </div>
  );
}

function GroupTitle({ children }: { children: ReactNode }) {
  return <p className="pt-3 pb-1 text-[11px] font-semibold tracking-[0.12em] text-mist-500 uppercase first:pt-0">{children}</p>;
}

export function DiagnosticsPanel() {
  const { t, format } = useI18n();
  const telegram = useTelegram();
  const { source } = useGameApi();
  const supabase = getSupabaseConfigStatus();
  const [check, setCheck] = useState<ConnectionCheck | null>(null);
  const [apiCheck, setApiCheck] = useState<GameApiConnectionCheck | null>(null);
  const [checking, setChecking] = useState(false);

  const tgStatus =
    telegram.status === "telegram" ? t.settings.tgConnected : telegram.status === "browser" ? t.settings.tgBrowser : t.settings.tgSdkMissing;

  const canCheckSupabase = getSupabaseConfigStatus().state === "configured";
  const canCheckGameApi = Boolean(env.gameApiUrl);

  async function runCheck() {
    setChecking(true);
    const [supabaseResult, gameApiResult] = await Promise.all([
      canCheckSupabase ? checkSupabaseConnection() : Promise.resolve(null),
      canCheckGameApi ? checkGameApiConnection() : Promise.resolve(null),
    ]);
    if (supabaseResult) setCheck(supabaseResult);
    if (gameApiResult) setApiCheck(gameApiResult);
    setChecking(false);
  }

  return (
    <Card className="px-4 py-3">
      <dl className="divide-y divide-white/[0.05]">
        <GroupTitle>{t.settings.telegram}</GroupTitle>
        <Row label={t.settings.telegram} value={tgStatus} tone={telegram.status === "telegram" ? "ok" : "muted"} />
        <Row label={t.settings.platform} value={telegram.platform ?? "—"} />
        <Row label={t.settings.sdkVersion} value={telegram.version ?? "—"} />
        <Row label={t.settings.userId} value={telegram.user?.id ?? "—"} />
        <Row
          label={t.settings.initData}
          value={telegram.initData ? t.settings.present : t.settings.absent}
          tone={telegram.initData ? "ok" : "muted"}
        />

        <GroupTitle>{t.settings.dataSource}</GroupTitle>
        <Row label={t.settings.dataSource} value={t.settings.sources[source.requested]} />
        <Row
          label={t.settings.activeMode}
          value={
            source.active === "demo"
              ? t.settings.modeDemo
              : source.active === "unavailable"
                ? `${t.settings.modeUnavailable}${source.blockReason ? ` · ${t.settings.blockReasons[source.blockReason]}` : ""}`
                : `${t.settings.modeLive} · ${t.settings.sources[source.active]}`
          }
          tone={source.active === "supabase" || source.active === "api" ? "ok" : "muted"}
        />

        <GroupTitle>{t.settings.supabase}</GroupTitle>
        <Row
          label={t.settings.supabase}
          value={
            supabase.state === "configured"
              ? t.settings.configured
              : supabase.state === "unsafe_key"
                ? t.settings.unsafeKey
                : t.settings.notConfigured
          }
          tone={supabase.state === "configured" ? "ok" : "muted"}
        />
        {supabase.state === "configured" && <Row label={t.settings.host} value={supabase.host} />}
        {check && (
          <Row
            label={t.settings.checkConnection}
            value={check.ok ? t.settings.connectionOk : format(t.settings.connectionFailed, { reason: check.reason })}
            tone={check.ok ? "ok" : "muted"}
          />
        )}

        <GroupTitle>{t.settings.gameApi}</GroupTitle>
        <Row
          label={t.settings.gameApi}
          value={env.gameApiUrl ? `${t.settings.configured} · ${new URL(env.gameApiUrl).host}` : t.settings.notConfigured}
          tone={env.gameApiUrl ? "ok" : "muted"}
        />
        {apiCheck && (
          <Row
            label={t.settings.checkConnection}
            value={
              apiCheck.ok
                ? t.settings.connectionOk
                : format(t.settings.connectionFailed, { reason: apiCheck.reason })
            }
            tone={apiCheck.ok ? "ok" : "muted"}
          />
        )}
      </dl>
      {(canCheckSupabase || canCheckGameApi) && (
        <Button
          variant="secondary"
          size="sm"
          block
          className="mt-3"
          onClick={runCheck}
          loading={checking}
          icon={<Activity className="size-4" aria-hidden />}
        >
          {checking ? t.settings.checking : t.settings.checkConnection}
        </Button>
      )}
    </Card>
  );
}
