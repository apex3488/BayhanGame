"use client";

import { useState } from "react";
import { Check, Coins, Crown, Flame, Gamepad2, Pickaxe, ShoppingBag, Target, Trophy, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useToast } from "@/components/ui/toast";
import { useFormat } from "@/lib/hooks/use-format";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { claimTaskReward } from "@/lib/services/task-service";
import { useGameApi } from "@/lib/state/game-api-context";
import { cn } from "@/lib/utils/cn";
import type { GameTask, TaskIcon } from "@/types/game";

const ICONS: Record<TaskIcon, LucideIcon> = {
  gamepad: Gamepad2,
  trophy: Trophy,
  pickaxe: Pickaxe,
  users: Users,
  coins: Coins,
  bag: ShoppingBag,
  flame: Flame,
  target: Target,
  crown: Crown,
};

export function TaskCard({ task, compact = false }: { task: GameTask; compact?: boolean }) {
  const { t, format, locale } = useI18n();
  const fmt = useFormat();
  const toast = useToast();
  const { api, isDemo } = useGameApi();
  const [claiming, setClaiming] = useState(false);
  const Icon = ICONS[task.icon] ?? Target;
  const done = task.status !== "in_progress";

  async function claim() {
    setClaiming(true);
    const result = await claimTaskReward(api, locale, task.id);
    setClaiming(false);
    if (result.ok) {
      toast({
        tone: "success",
        title: `${task.title}: ${fmt.signedUsd(result.data.rewardUsd)}`,
        description: isDemo ? t.demo.claimDone : t.tasks.claimedServer,
      });
    } else {
      toast({ tone: "error", title: t.errors[result.error.code] });
    }
  }

  return (
    <article
      className={cn(
        "surface flex items-center gap-3",
        compact ? "p-3" : "p-3.5",
        task.status === "completed" && "border-brand-400/30 bg-brand-500/[0.06]",
        task.status === "claimed" && "opacity-70",
      )}
    >
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-2xl border",
          done ? "border-brand-400/40 bg-brand-500/20 text-white" : "border-white/[0.08] bg-white/[0.04] text-brand-200",
        )}
      >
        {task.status === "claimed" ? <Check className="size-5" aria-hidden /> : <Icon className="size-5" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-sm font-semibold">{task.title}</h3>
          <span className="tabular shrink-0 text-[12px] font-semibold text-brand-200">{fmt.signedUsd(task.rewardUsd)}</span>
        </div>
        {!compact && <p className="mt-0.5 truncate text-[12px] text-mist-500">{task.description}</p>}
        <div className="mt-2 flex items-center gap-2.5">
          <ProgressBar value={task.progress} max={task.target} label={task.title} size="sm" className="flex-1" />
          <span className="tabular shrink-0 text-[11px] text-mist-500">
            {format(t.tasks.progress, { p: fmt.number(task.progress), t: fmt.number(task.target) })}
          </span>
        </div>
      </div>
      {task.status === "completed" && (
        <Button size="sm" onClick={claim} loading={claiming} className="shrink-0">
          {t.tasks.claim}
        </Button>
      )}
    </article>
  );
}
