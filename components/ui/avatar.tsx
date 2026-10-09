"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const FRAMES = new Set(["frame-cyber", "frame-ice", "frame-neon", "frame-diamond", "frame-matrix", "frame-galaxy", "frame-black", "frame-limited"]);
const EFFECTS = new Set(["fx-pulse", "fx-scan", "fx-orbit", "fx-spark"]);

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number;
  /** Store preview key, e.g. "frame-neon". Unknown keys are ignored. */
  frame?: string | null;
  effect?: string | null;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}` : name.trim().slice(0, 2);
  return letters.toUpperCase() || "B";
}

export function Avatar({ name, photoUrl, size = 44, frame, effect, className }: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = Boolean(photoUrl) && failedUrl !== photoUrl;
  const frameClass = frame && FRAMES.has(frame) ? frame : null;
  const effectClass = effect && EFFECTS.has(effect) ? effect : null;

  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      {effectClass && <span className={cn("fx", effectClass)} aria-hidden />}
      <span className="relative grid size-full place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-400 via-brand-600 to-ink-700 ring-1 ring-white/10">
        {showPhoto && photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Telegram avatars; static export has no image optimizer
          <img
            src={photoUrl}
            alt=""
            width={size}
            height={size}
            referrerPolicy="no-referrer"
            className="size-full object-cover"
            onError={() => setFailedUrl(photoUrl)}
          />
        ) : (
          <span className="font-semibold text-white" style={{ fontSize: Math.max(11, size * 0.36) }} aria-hidden>
            {initials(name)}
          </span>
        )}
      </span>
      {frameClass && <span className={cn("frame", frameClass)} aria-hidden />}
    </span>
  );
}
