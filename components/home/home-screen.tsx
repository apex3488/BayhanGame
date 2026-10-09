"use client";

import { Inbox } from "lucide-react";
import { GameTile } from "@/components/games/game-card";
import { ConnectionBanner } from "@/components/layout/connection-banner";
import { DemoNotice } from "@/components/layout/demo-notice";
import { Card, Section } from "@/components/ui/card";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/feedback";
import { TaskCard } from "@/components/tasks/task-card";
import { PRACTICE_MODES } from "@/lib/games/catalog";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useActivity } from "@/lib/services/player-service";
import { activeTasks, useTasks } from "@/lib/services/task-service";
import { useGameApi } from "@/lib/state/game-api-context";
import { ActivityList } from "./activity-list";
import { BalanceCard } from "./balance-card";
import { DailyRewardCard } from "./daily-reward-card";
import { HomeHeader } from "./home-header";
import { ProgressCard, RankCard } from "./progress-cards";
import { QuickActions } from "./quick-actions";

function ActiveTasksSection() {
  const { t } = useI18n();
  const tasks = useTasks();
  const list = tasks.data ? activeTasks(tasks.data, 2) : null;
  if (list && list.length === 0) return null;
  return (
    <Section id="home-tasks" title={t.home.activeTasks} action={{ label: t.common.seeAll, href: "/tasks" }}>
      {list ? (
        <div className="space-y-2.5">
          {list.map((task) => (
            <TaskCard key={task.id} task={task} compact />
          ))}
        </div>
      ) : tasks.status === "error" ? (
        <ErrorState error={tasks.error} onRetry={tasks.reload} />
      ) : (
        <SkeletonList rows={2} />
      )}
    </Section>
  );
}

function RecentActivitySection() {
  const { t } = useI18n();
  const activity = useActivity(5);
  return (
    <Section id="home-activity" title={t.home.activity}>
      {activity.data ? (
        activity.data.length > 0 ? (
          <Card className="px-4 py-2">
            <ActivityList items={activity.data} />
          </Card>
        ) : (
          <EmptyState icon={Inbox} title={t.home.noActivity} description={t.home.noActivityHint} />
        )
      ) : activity.status === "error" ? (
        <ErrorState error={activity.error} onRetry={activity.reload} />
      ) : (
        <SkeletonList rows={3} />
      )}
    </Section>
  );
}

export function HomeScreen() {
  const { t } = useI18n();
  const { isUnavailable, isDemo } = useGameApi();
  return (
    <div className="space-y-6">
      <HomeHeader />
      <DemoNotice />
      <ConnectionBanner />
      {isUnavailable ? (
        <>
          <QuickActions />
          <Section id="home-games" title={t.home.gamesTitle} action={{ label: t.common.seeAll, href: "/games" }}>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
              {PRACTICE_MODES.map((mode) => (
                <GameTile key={mode.id} mode={mode} />
              ))}
            </div>
          </Section>
          <Section id="home-city" title={t.home.cityTitle} action={{ label: t.common.seeAll, href: "/city" }}>
            <Card className="p-4 text-[13px] leading-relaxed text-mist-300">{t.connection.catalogBrowseHint}</Card>
          </Section>
        </>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-[1.35fr_1fr] md:items-start">
            <BalanceCard />
            <div className="space-y-6">
              <QuickActions />
              <DailyRewardCard />
            </div>
          </div>
          <Section id="home-games" title={t.home.gamesTitle} action={{ label: t.common.seeAll, href: "/games" }}>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
              {PRACTICE_MODES.map((mode) => (
                <GameTile key={mode.id} mode={mode} />
              ))}
            </div>
          </Section>
          <Section id="home-city" title={t.home.cityTitle} action={{ label: t.common.seeAll, href: "/city" }}>
            <Card className="p-4 text-[13px] leading-relaxed text-mist-300">
              {isDemo ? t.city.demoNote : t.city.subtitle}
            </Card>
          </Section>
          <div className="grid grid-cols-2 gap-3 animate-fade-up">
            <ProgressCard />
            <RankCard />
          </div>
          <ActiveTasksSection />
          <RecentActivitySection />
        </>
      )}
    </div>
  );
}
