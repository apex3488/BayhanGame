"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { haptic } from "@/lib/telegram/webapp";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "white";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-brand-400 to-brand-500 text-white shadow-[0_10px_30px_-12px_rgb(36_107_253/0.9),inset_0_1px_0_rgb(255_255_255/0.25)] hover:from-brand-300 hover:to-brand-400 disabled:from-ink-600 disabled:to-ink-600 disabled:text-mist-500 disabled:shadow-none",
  secondary: "bg-white/[0.06] text-white border border-white/10 hover:bg-white/10 disabled:text-mist-500",
  ghost: "text-mist-300 hover:text-white hover:bg-white/5 disabled:text-mist-700",
  outline: "border border-brand-400/50 text-brand-200 hover:bg-brand-500/10 disabled:border-white/10 disabled:text-mist-500",
  white: "bg-white text-ink-950 hover:bg-brand-100 disabled:bg-white/20 disabled:text-ink-700",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-xl",
  md: "h-11 px-5 text-sm gap-2 rounded-2xl",
  lg: "h-13 px-6 text-[15px] gap-2 rounded-2xl",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", block = false): string {
  return cn(
    "press inline-flex select-none items-center justify-center font-semibold tracking-[-0.01em] whitespace-nowrap",
    VARIANTS[variant],
    SIZES[size],
    block && "w-full",
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  block,
  loading,
  icon,
  className,
  children,
  disabled,
  onClick,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClasses(variant, size, block), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={(event) => {
        haptic.impact("light");
        onClick?.(event);
      }}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: ReactNode;
}

export function ButtonLink({ variant = "primary", size = "md", block, icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonClasses(variant, size, block), className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
