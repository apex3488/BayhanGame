"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { haptic } from "@/lib/telegram/webapp";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { cn } from "@/lib/utils/cn";

export type ToastTone = "success" | "info" | "error";

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastItem extends Required<Pick<ToastInput, "title" | "tone">> {
  id: number;
  description?: string;
}

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

const ICONS = { success: CircleCheck, info: Info, error: TriangleAlert } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  const show = useCallback(
    ({ title, description, tone = "info" }: ToastInput) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((list) => [...list.slice(-2), { id, title, description, tone }]);
      haptic.notify(tone === "error" ? "error" : tone === "success" ? "success" : "warning");
      window.setTimeout(() => dismiss(id), 3600);
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(var(--content-top)+0.75rem)] z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className="glass pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-white/10 px-4 py-3 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.8)] animate-toast-in"
            >
              <Icon
                className={cn("mt-0.5 size-5 shrink-0", toast.tone === "error" ? "text-white" : "text-brand-300")}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-[13px] leading-snug text-mist-300">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label={t.common.close}
                className="-mr-1 grid size-7 shrink-0 place-items-center rounded-full text-mist-500 hover:text-white"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (toast: ToastInput) => void {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside <ToastProvider>");
  return value;
}
