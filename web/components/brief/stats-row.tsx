"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";

import { CountUp } from "@/components/ui/count-up";
import type { BriefSummary } from "@/lib/brief-types";
import { rise } from "@/lib/motion";
import { averageScore, fitTier } from "@/lib/score";

interface StatsRowProps {
  briefs: BriefSummary[];
}

const FIT_SCALE = 5;
const COUNT_STAGGER_MS = 80;

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-4 py-5 sm:px-7 sm:py-6">
      <dt className="micro-label">{label}</dt>
      <dd className="mt-3 flex items-baseline gap-1.5 text-[32px] font-semibold leading-none tracking-display sm:text-[40px]">
        {children}
      </dd>
    </div>
  );
}

/** Three headline numbers for the partner's briefs. One surface, hairline dividers. */
export function StatsRow({ briefs }: StatsRowProps) {
  if (briefs.length === 0) return null;

  const average = averageScore(briefs.map((brief) => brief.score));
  const strong = briefs.filter((brief) => fitTier(brief.score, FIT_SCALE) === "strong").length;

  return (
    <m.dl variants={rise} className="card grid grid-cols-3 divide-x divide-line">
      <Stat label="Briefs">
        <CountUp value={briefs.length} />
      </Stat>
      <Stat label="Average fit">
        {average == null ? (
          <span className="text-ink-2">&ndash;</span>
        ) : (
          <>
            <CountUp value={average} decimals={1} delayMs={COUNT_STAGGER_MS} />
            <span className="text-sm font-medium tracking-normal text-ink-2 sm:text-lg">/ {FIT_SCALE}</span>
          </>
        )}
      </Stat>
      <Stat label="Strong fits">
        <CountUp value={strong} delayMs={COUNT_STAGGER_MS * 2} />
      </Stat>
    </m.dl>
  );
}
