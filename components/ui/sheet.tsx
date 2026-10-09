"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils/cn";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Bottom sheet on mobile, centered dialog from md+. Closes on Esc and backdrop tap. */
export function Sheet({ open, onClose, title, description, children, footer, className }: SheetProps) {
  const { t } = useI18n();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <button
        type="button"
        aria-label={t.common.close}
        tabIndex={-1}
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-white/10 bg-ink-900 outline-none animate-sheet-up",
          "md:max-w-lg md:rounded-[1.75rem] md:animate-pop",
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(70%_100%_at_50%_0%,rgb(36_107_253/0.18),transparent)]" />
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/15 md:hidden" aria-hidden />
        <header className="relative flex items-start justify-between gap-4 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold tracking-[-0.02em]">
              {title}
            </h2>
            {description && <p className="mt-1 text-[13px] text-mist-300">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="press -mr-1 grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-mist-300 hover:text-white"
          >
            <X className="size-4.5" aria-hidden />
          </button>
        </header>
        <div className="relative flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <footer className="relative border-t border-white/[0.06] px-5 pt-4 pb-[calc(1rem+var(--safe-bottom))] md:pb-5">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
