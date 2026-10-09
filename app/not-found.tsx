"use client";

import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n/i18n-provider";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="pt-10">
      <EmptyState
        icon={Compass}
        title={t.notFound.title}
        description={t.notFound.text}
        action={<ButtonLink href="/">{t.notFound.action}</ButtonLink>}
      />
    </div>
  );
}
