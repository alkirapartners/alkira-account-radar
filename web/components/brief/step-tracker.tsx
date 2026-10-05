"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/cn";
import type { BriefPhase } from "@/lib/brief-types";

export const STEPS: ReadonlyArray<{ phase: BriefPhase; label: string; detail: string }> = [
  { phase: "init", label: "Starting", detail: "Setting up the research run" },
  { phase: "research", label: "Researching", detail: "Running 8 web searches" },
  { phase: "analyze", label: "Analyzing", detail: "Ranking results and reading the top 5 pages" },
  { phase: "compose", label: "Composing", detail: "Writing the brief from those sources" },
];

interface StepTrackerProps {
  /** The phase in progress, or "done" once the brief is saved. */
  phase: BriefPhase | "done";
}

export function activeStepIndex(phase: BriefPhase | "done"): number {
  if (phase === "done") return STEPS.length;
  return Math.max(0, STEPS.findIndex((step) => step.phase === phase));
}

export function StepTracker({ phase }: StepTrackerProps) {
  const active = activeStepIndex(phase);
  const current = STEPS[Math.min(active, STEPS.length - 1)];

  return (
    <div>
      <ol className="flex items-start">
        {STEPS.map((step, index) => {
          const isDone = index < active;
          const isActive = index === active;
          const isLast = index === STEPS.length - 1;
          return (
            <li
              key={step.phase}
              aria-current={isActive ? "step" : undefined}
              className={cn("relative flex flex-col items-start", isLast ? "flex-none" : "flex-1")}
            >
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-colors duration-base ease-out",
                    isDone && "bg-accent-soft text-ambient",
                    isActive && "bg-white text-ambient",
                    !isDone && !isActive && "bg-white/10 text-on-ambient-2",
                  )}
                >
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 animate-[pulse-ring_1.6s_var(--ease-out)_infinite] rounded-full bg-white/50"
                    />
                  ) : null}
                  <span className="relative num">
                    {isDone ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : index + 1}
                  </span>
                </span>
                {isLast ? null : (
                  <span className="relative mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-white/10 sm:mx-3" aria-hidden="true">
                    <span
                      className={cn(
                        "absolute inset-0 origin-left rounded-full bg-accent-soft transition-transform duration-slow ease-out",
                        isDone ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "mt-3 hidden text-sm font-medium transition-colors duration-base sm:block",
                  isDone || isActive ? "text-on-ambient" : "text-on-ambient-2",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-5 text-[15px] text-on-ambient-2 sm:mt-4" role="status">
        <span className="font-medium text-on-ambient sm:sr-only">
          {phase === "done" ? "Done" : `Step ${active + 1} of ${STEPS.length}: ${current.label}. `}
        </span>
        {phase === "done" ? <span className="sm:hidden">. </span> : null}
        {phase === "done" ? "Opening your brief" : current.detail}
      </p>
    </div>
  );
}
