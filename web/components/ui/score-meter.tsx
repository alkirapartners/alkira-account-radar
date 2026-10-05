"use client";

import { m } from "motion/react";

import { cn } from "@/lib/cn";
import { DUR, EASE_OUT } from "@/lib/motion";
import { FIT_LABEL, fitTier, type FitTier, type ScoreScale } from "@/lib/score";

interface ScoreMeterProps {
  score: number | null | undefined;
  scale: ScoreScale;
  size?: "sm" | "md" | "lg";
  tone?: "light" | "ambient";
  /** Fill the ticks one after another when the meter appears. */
  animate?: boolean;
  /** Seconds to wait before the first tick fills. */
  delay?: number;
  /** What the score measures, for the spoken label. */
  subject?: string;
  className?: string;
}

const TICK_STEP_SECONDS = 0.04;

const TICK_SIZE = {
  sm: "h-3 w-1",
  md: "h-[18px] w-[5px]",
  lg: "h-8 w-2",
} as const;

const GAP = { sm: "gap-[3px]", md: "gap-1", lg: "gap-1.5" } as const;

const TRACK = { light: "bg-ink/10", ambient: "bg-white/15" } as const;

const FILL: Record<"light" | "ambient", Record<FitTier, string>> = {
  light: { strong: "bg-accent", moderate: "bg-warning-fill", weak: "bg-ink-3", none: "" },
  ambient: { strong: "bg-accent-soft", moderate: "bg-warning-fill", weak: "bg-white/50", none: "" },
};

export function ScoreMeter({
  score,
  scale,
  size = "md",
  tone = "light",
  animate = false,
  delay = 0,
  subject = "Fit score",
  className,
}: ScoreMeterProps) {
  const tier = fitTier(score, scale);
  const filled = tier === "none" ? 0 : Math.min(scale, Math.max(0, Math.round(score ?? 0)));
  const label =
    tier === "none" ? `${subject}: not scored` : `${subject} ${filled} of ${scale}, ${FIT_LABEL[tier].toLowerCase()}`;

  return (
    <span role="img" aria-label={label} className={cn("inline-flex items-end", GAP[size], className)}>
      {Array.from({ length: scale }, (_, index) => {
        const isFilled = index < filled;
        return (
          <span
            key={index}
            data-filled={isFilled || undefined}
            className={cn("relative overflow-hidden rounded-full", TICK_SIZE[size], TRACK[tone])}
          >
            {isFilled ? (
              <m.span
                className={cn("absolute inset-0 origin-bottom rounded-full", FILL[tone][tier])}
                initial={animate ? { scaleY: 0, opacity: 0 } : false}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ duration: DUR.base, ease: EASE_OUT, delay: delay + index * TICK_STEP_SECONDS }}
              />
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
