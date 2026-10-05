"use client";

import { useReducedMotionConfig } from "motion/react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

interface CountUpProps {
  value: number;
  decimals?: number;
  durationMs?: number;
  /** Milliseconds to wait before counting starts. */
  delayMs?: number;
  className?: string;
}

const DEFAULT_DURATION_MS = 700;

/** Decelerating curve: fast at first, settling onto the value. */
const easeOutExpo = (progress: number) => (progress >= 1 ? 1 : 1 - 2 ** (-10 * progress));

/**
 * A number that counts up to its value the first time it appears. Digits are
 * fixed-width, so the count never shifts the layout. Under reduced motion it
 * shows the final value straight away.
 */
export function CountUp({ value, decimals = 0, durationMs = DEFAULT_DURATION_MS, delayMs = 0, className }: CountUpProps) {
  // Follows <MotionConfig>, which follows the viewer's system setting.
  const reducedMotion = useReducedMotionConfig();
  const [shown, setShown] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setShown(value);
      return;
    }
    let frame = 0;
    let start: number | null = null;

    const tick = (now: number) => {
      start ??= now + delayMs;
      const progress = Math.min(1, Math.max(0, (now - start) / durationMs));
      setShown(value * easeOutExpo(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, delayMs, reducedMotion]);

  return (
    <span className={cn("tabular-nums", className)} aria-label={value.toFixed(decimals)}>
      <span aria-hidden="true">{shown.toFixed(decimals)}</span>
    </span>
  );
}
