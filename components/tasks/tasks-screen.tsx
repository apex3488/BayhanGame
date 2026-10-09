"use client";

import { useState } from "react";
import { ListChecks, ShieldCheck } from "lucide-react";
import { DemoChip } from "@/components/layout/demo-notice";
import { PageHeader } from "@/components/layout/page-header";
import { Segmented } from "@/components/ui/controls";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/feedback";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { TASK_PERIODS, taskSummary, useTasks } from "@/lib/services/task-service";
import { useGameApi } from "@/lib/state/game-api-context";
import type { TaskPeriod } from "@/types/game";
import { TaskCard } from "./task-card";

export function TasksScreen() {
  const { t, format } = useI18n();
  const tasks = useTasks();
  const { isDemo } = useGameApi();
  const [period, setPeriod] = useState<TaskPeriod>("daily");

  const list = (tasks.data ?? []).filter((task) => task.period === period);
  const summary = taskSummary(list);

  return (
    <div className="space-y-5">
      <PageHeader title={t.tasks.title} subtitle={t.tasks.subtitle} backHref="/" actions={<DemoChip />} />

      <Segmented
        label={t.tasks.title}
        value={period}
        onChange={setPeriod}
        options={TASK_PERIODS.map((value) => ({ value, label: t.tasks.tabs[value] }))}
      />

      {!tasks.data ? (
        tasks.status === "error" ? <ErrorState error={tasks.error} onRetry={tasks.reload} /> : <SkeletonList rows={4} />
      ) : list.length === 0 ? (
        <EmptyState icon={ListChecks} title={t.tasks.empty} description={t.tasks.emptyHint} />
      ) : (
        <>
          <div className="surface relative overflow-hidden p-4 animate-fade-up">
            <div className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-brand-500/20 blur-3xl" aria-hidden />
            <p className="relative text-[13px] text-mist-300">{t.tasks.tabs[period]}</p>
            <p className="tabular relative mt-1 text-2xl font-bold tracking-[-0.03em]">
              {summary.done}
              <span className="text-mist-500"> / {summary.total}</span>
            </p>
            <ProgressBar className="relative mt-3" value={summary.done} max={summary.total} label={format(t.tasks.summary, summary)} />
            <p className="relative mt-2 text-[12px] text-mist-500">{format(t.tasks.summary, summary)}</p>
          </div>
          <div className="space-y-2.5">
            {list.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
          {isDemo ? (
            <p className="text-center text-[11.5px] text-mist-500">{t.demo.text}</p>
          ) : (
            <p className="flex items-center justify-center gap-1.5 text-center text-[11.5px] text-mist-500">
              <ShieldCheck className="size-3.5 text-brand-300" aria-hidden />
              {t.tasks.serverNote}
            </p>
          )}
        </>
      )}
    </div>
  );
}
