import type { HTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("surface", className)} {...rest} />;
}

interface SectionProps {
  title: string;
  action?: { label: string; href: string };
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function Section({ title, action, aside, children, className, id }: SectionProps) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section className={cn("animate-fade-up", className)} aria-labelledby={headingId}>
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h2 id={headingId} className="text-[15px] font-semibold tracking-[-0.01em] text-white">
          {title}
        </h2>
        {action ? (
          <Link
            href={action.href}
            className="press -mr-1 inline-flex items-center gap-0.5 rounded-lg px-1.5 py-1 text-[13px] font-medium text-brand-300 hover:text-brand-200"
          >
            {action.label}
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          aside
        )}
      </div>
      {children}
    </section>
  );
}
