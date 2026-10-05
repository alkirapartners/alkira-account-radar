"use client";

import { formatElapsed, useElapsedSeconds } from "@/hooks/use-elapsed";
import type { BriefPhase } from "@/lib/brief-types";

import { StepTracker } from "./step-tracker";

interface ProgressViewProps {
  company: string;
  phase: BriefPhase | "done";
  startedAt: number;
  /** "Writing" for a new brief, "Updating" for a re-research. */
  verb?: "Writing" | "Updating";
}

export function ProgressView({ company, phase, startedAt, verb = "Writing" }: ProgressViewProps) {
  const elapsed = useElapsedSeconds(startedAt);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-accent-soft">{verb} your brief</p>
          <h2 className="mt-3 truncate text-3xl font-semibold tracking-display sm:text-4xl">{company}</h2>
        </div>
        <p className="num shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-sm text-on-ambient" aria-label={`Elapsed time ${formatElapsed(elapsed)}`}>
          {formatElapsed(elapsed)}
        </p>
      </div>
      <div className="mt-9">
        <StepTracker phase={phase} />
      </div>
      <p className="mt-8 border-t border-white/10 pt-5 text-sm text-on-ambient-2">
        You can leave this page. The brief will be in your list when it&rsquo;s done.
      </p>
    </div>
  );
}
