"use client";

import type { ReactNode } from "react";
import { CloudOff, type LucideIcon } from "lucide-react";
import type { ApiError } from "@/lib/api/result";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils/cn";
import { Button } from "./button";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function SkeletonList({ rows = 3, className }: { rows?: number; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn("space-y-2.5", className)} role="status" aria-label={t.common.loading}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("surface flex flex-col items-center px-6 py-10 text-center animate-fade-in", className)}>
      <div className="relative mb-4 grid size-14 place-items-center rounded-2xl border border-brand-400/25 bg-brand-500/10">
        <div className="absolute inset-0 rounded-2xl bg-brand-500/20 blur-xl" aria-hidden />
        <Icon className="relative size-6 text-brand-200" aria-hidden />
      </div>
      <p className="text-[15px] font-semibold text-white">{title}</p>
      {description && <p className="mt-1.5 max-w-64 text-[13px] leading-relaxed text-mist-300">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: ApiError | undefined; onRetry?: () => void; className?: string }) {
  const { t } = useI18n();
  const message = error ? t.errors[error.code] : t.errors.unknown;
  return (
    <EmptyState
      icon={CloudOff}
      title={t.errors.title}
      description={message}
      className={className}
      action={
        onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {t.common.retry}
          </Button>
        )
      }
    />
  );
}
