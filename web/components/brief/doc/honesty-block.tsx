"use client";

import { CircleHelp, TrendingUp } from "lucide-react";
import { m } from "motion/react";

import { ScoreMeter } from "@/components/ui/score-meter";
import { cn } from "@/lib/cn";
import { rise } from "@/lib/motion";

interface HonestyBlockProps {
  unconfirmed: readonly string[];
  raiseScore: readonly string[];
  score: number;
  labels: Record<string, string>;
}

const FIT_SCALE = 5;
const HEADING = "text-xl font-semibold tracking-heading";
const ITEM = "flex gap-3 text-[15px] leading-relaxed text-ink";

/**
 * What the brief does not know, and what would change its mind. Set on the
 * canvas inside a dashed outline, not on a white card: these are open
 * questions, and they should not look as settled as the findings above them.
 */
export function HonestyBlock({ unconfirmed, raiseScore, score, labels }: HonestyBlockProps) {
  const hasBoth = unconfirmed.length > 0 && raiseScore.length > 0;

  return (
    <m.div
      variants={rise}
      className={cn(
        "grid rounded-card border border-dashed border-ink/20",
        hasBoth && "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]",
      )}
    >
      {unconfirmed.length > 0 ? (
        <section aria-labelledby="unconfirmed-heading" className="p-6 sm:p-7">
          <h2 id="unconfirmed-heading" className={HEADING}>
            {labels.unconfirmed ?? "What we couldn't confirm"}
          </h2>
          <ul className={cn("mt-5 grid gap-x-8 gap-y-3.5", !hasBoth && "md:grid-cols-2")}>
            {unconfirmed.map((item, index) => (
              <li key={index} className={ITEM}>
                <CircleHelp className="mt-[3px] h-[18px] w-[18px] shrink-0 text-ink-2" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {raiseScore.length > 0 ? (
        <section
          aria-labelledby="raise-heading"
          className={cn("p-6 sm:p-7", hasBoth && "border-t border-dashed border-ink/20 lg:border-l lg:border-t-0")}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2 id="raise-heading" className={HEADING}>
              {labels.raise_score ?? "What would raise the score"}
            </h2>
            <ScoreMeter score={score} scale={FIT_SCALE} size="md" subject={labels.alkira_fit ?? "Alkira Fit"} />
          </div>
          <ul className="mt-5 grid gap-y-3.5">
            {raiseScore.map((item, index) => (
              <li key={index} className={ITEM}>
                <TrendingUp className="mt-[3px] h-[18px] w-[18px] shrink-0 text-accent" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </m.div>
  );
}
