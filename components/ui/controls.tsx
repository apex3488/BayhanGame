"use client";

import type { ReactNode } from "react";
import { haptic } from "@/lib/telegram/webapp";
import { cn } from "@/lib/utils/cn";

interface Option<T extends string | number> {
  value: T;
  label: ReactNode;
}

interface SegmentedProps<T extends string | number> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
  size?: "sm" | "md";
}

/** Tab-like single choice. Uses role="tablist" semantics for screen readers. */
export function Segmented<T extends string | number>({ options, value, onChange, label, className, size = "md" }: SegmentedProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn("flex rounded-2xl border border-white/[0.07] bg-white/[0.03] p-1", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) haptic.selection();
              onChange(option.value);
            }}
            className={cn(
              "press flex-1 rounded-xl font-semibold transition-colors",
              size === "sm" ? "h-8 px-2 text-[12px]" : "h-9 px-3 text-[13px]",
              active ? "bg-brand-500 text-white shadow-[0_6px_20px_-8px_rgb(36_107_253/0.9)]" : "text-mist-300 hover:text-white",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

interface ChipsProps<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/** Horizontally scrolling filter chips (radio group semantics). */
export function Chips<T extends string>({ options, value, onChange, label, className }: ChipsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              if (!active) haptic.selection();
              onChange(option.value);
            }}
            className={cn(
              "press h-9 shrink-0 rounded-full border px-4 text-[13px] font-medium",
              active
                ? "border-brand-400/60 bg-brand-500/15 text-white shadow-[0_0_0_1px_rgb(36_107_253/0.25)]"
                : "border-white/[0.08] bg-white/[0.03] text-mist-300 hover:text-white",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function SwitchRow({ checked, onChange, label, description }: SwitchProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-white">{label}</span>
        {description && <span className="mt-0.5 block text-[12px] text-mist-500">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => {
          haptic.selection();
          onChange(!checked);
        }}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
          checked ? "border-brand-400 bg-brand-500" : "border-white/10 bg-white/[0.08]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5.5 rounded-full bg-white shadow transition-transform duration-200",
            checked && "translate-x-5",
          )}
        />
      </button>
    </label>
  );
}
