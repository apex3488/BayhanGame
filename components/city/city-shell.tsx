"use client";

import type { ReactNode } from "react";
import { DemoChip } from "@/components/layout/demo-notice";
import { PageHeader } from "@/components/layout/page-header";
import { LiveBotNotice } from "./demo-actions";

export function CityShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <PageHeader title={title} subtitle={subtitle} backHref="/city" actions={<DemoChip />} />
      <LiveBotNotice />
      {children}
    </div>
  );
}
