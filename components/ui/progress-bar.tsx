import { cn } from "@/lib/utils/cn";

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  className?: string;
  size?: "sm" | "md";
}

export function ProgressBar({ value, max, label, className, size = "md" }: ProgressBarProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className={cn("overflow-hidden rounded-full bg-white/[0.07]", size === "sm" ? "h-1.5" : "h-2", className)}
    >
      <div className="progress-fill h-full rounded-full" style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}
