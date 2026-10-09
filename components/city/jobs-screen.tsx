"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { JOBS } from "@/lib/demo/lifestyle-catalog";
import { useLifestyle, workJob } from "@/lib/demo/lifestyle-state";
import { useFormat } from "@/lib/hooks/use-format";
import { useNow } from "@/lib/hooks/use-now";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useToast } from "@/components/ui/toast";
import { useDemoActionsAllowed } from "./demo-actions";
import { CityShell } from "./city-shell";

export function JobsScreen() {
  const { t, locale, format } = useI18n();
  const fmt = useFormat();
  const life = useLifestyle();
  const now = useNow();
  const toast = useToast();
  const demo = useDemoActionsAllowed();

  return (
    <CityShell title={t.city.jobs} subtitle={t.city.jobsHint}>
      <div className="space-y-2.5">
        {JOBS.map((job) => {
          const until = life.jobsCooldownUntil[job.id];
          const cooling = until ? Date.parse(until) > now : false;
          return (
            <Card key={job.id} className="flex items-start gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{job.name[locale]}</p>
                <p className="mt-0.5 text-[12.5px] text-mist-500">{job.description[locale]}</p>
                <p className="tabular mt-2 text-[13px] text-brand-200">
                  {fmt.usd(job.incomeMin)} – {fmt.usd(job.incomeMax)}
                </p>
                <p className="mt-1 text-[11.5px] text-mist-500">
                  {job.requireCar ? `${t.city.requireCar} · ` : ""}
                  {format(t.city.minCapital, { n: fmt.usd(job.minCapitalUsd) })}
                </p>
              </div>
              <Button
                size="sm"
                disabled={!demo || cooling}
                onClick={() => {
                  const result = workJob(job.id);
                  if (!result.ok) {
                    toast({ tone: "error", title: t.errors[result.error.code] });
                    return;
                  }
                  toast({
                    tone: "success",
                    title: format(t.city.earned, { n: fmt.usd(result.data.income) }),
                    description: t.demo.claimDone,
                  });
                }}
              >
                {cooling ? t.city.cooldown : t.city.work}
              </Button>
            </Card>
          );
        })}
      </div>
    </CityShell>
  );
}
