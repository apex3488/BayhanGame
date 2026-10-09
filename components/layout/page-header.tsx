"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/i18n-provider";
import { useTelegramBackButton } from "@/lib/telegram/telegram-provider";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Parent route for nested screens. Also wires Telegram's native BackButton. */
  backHref?: string;
  actions?: ReactNode;
}

function TelegramBack({ href }: { href: string }) {
  const router = useRouter();
  useTelegramBackButton(() => router.push(href));
  return null;
}

export function PageHeader({ title, subtitle, backHref, actions }: PageHeaderProps) {
  const { t } = useI18n();
  return (
    <header className="mb-5 flex items-center gap-3 animate-fade-up">
      {backHref && (
        <>
          <TelegramBack href={backHref} />
          <Link
            href={backHref}
            aria-label={t.common.back}
            className="press grid size-10 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04] text-mist-300 hover:text-white"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
        </>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[26px] leading-tight font-bold tracking-[-0.03em]">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-[13px] text-mist-300">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
