"use client";

import { AnimatePresence, m } from "motion/react";
import type { ReactNode } from "react";

import { ScoreMeter } from "@/components/ui/score-meter";
import { DUR, EASE_IN, EASE_OUT } from "@/lib/motion";

interface PinnedBarProps {
  visible: boolean;
  company: string;
  score: number;
  actions: ReactNode;
}

/** The brief's name and actions, kept in reach once its header has scrolled away. */
export function PinnedBar({ visible, company, score, actions }: PinnedBarProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <m.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT } }}
          exit={{ opacity: 0, y: -8, transition: { duration: DUR.fast, ease: EASE_IN } }}
          className="fixed inset-x-0 top-[var(--bar-height)] z-20 border-b border-line bg-canvas/85 backdrop-blur-xl"
        >
          <div className="page flex h-14 items-center justify-between gap-4">
            <p className="flex min-w-0 items-center gap-3.5">
              <span className="truncate font-semibold tracking-heading">{company}</span>
              <ScoreMeter score={score} scale={5} size="sm" className="hidden shrink-0 sm:inline-flex" />
            </p>
            {actions}
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
