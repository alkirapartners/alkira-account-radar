import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type PillTone = "neutral" | "surface" | "accent" | "positive" | "warning" | "negative" | "ambient";

const TONES: Record<PillTone, string> = {
  neutral: "bg-sunken text-ink-2",
  // For a pill that sits on a tinted area, where the sunken grey would look muddy.
  surface: "bg-surface text-ink-2 shadow-[inset_0_0_0_1px_rgb(var(--ink-rgb)/0.07)]",
  accent: "bg-accent/10 text-accent",
  positive: "bg-positive-tint text-positive",
  warning: "bg-warning-tint text-warning",
  negative: "bg-negative-tint text-negative",
  ambient: "bg-white/10 text-on-ambient",
};

interface PillProps {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}

export function Pill({ tone = "neutral", children, className }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
