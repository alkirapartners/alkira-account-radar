"use client";

import { m } from "motion/react";

import type { BriefDetail } from "@/lib/brief-types";
import { rise, stagger } from "@/lib/motion";

import { EntryPointTile } from "./tiles/entry-point-tile";
import { InfraTiles, hasInfra } from "./tiles/infra-tiles";
import { ReferencesTile } from "./tiles/references-tile";
import { ScoreTile } from "./tiles/score-tile";
import { SignalsTile } from "./tiles/signals-tile";
import { StartersTile } from "./tiles/starters-tile";

interface BriefBentoProps {
  brief: BriefDetail;
}

/** Column span for each entry point, so one, two or three always fill the row. */
const ENTRY_SPAN: Record<number, string> = {
  1: "col-span-full",
  2: "col-span-full md:col-span-6",
  3: "col-span-full md:col-span-6 lg:col-span-4",
};

/**
 * The brief as a bento grid. A section with nothing in it is left out, so a
 * sparse brief closes up instead of showing empty shells. The score tile always
 * shows, because "not scored" is itself worth saying.
 */
export function BriefBento({ brief }: BriefBentoProps) {
  const { labels } = brief;
  const showInfra = hasInfra(brief.infra);
  const showSignals = brief.signals.length > 0;
  const entryCount = brief.entryPoints.length;

  return (
    <m.div variants={stagger(0.04, 0.05)} className="grid grid-cols-12 gap-4">
      <ScoreTile label={labels.alkira_fit ?? "Alkira Fit"} score={brief.score} rationale={brief.scoreRationale} />

      {showInfra ? <InfraTiles infra={brief.infra} labels={labels} /> : null}
      {showSignals ? (
        <SignalsTile label={labels.signals_timing ?? "Signals & Timing"} signals={brief.signals} wide={!showInfra} />
      ) : null}

      {brief.entryPoints.map((point, index) => (
        <EntryPointTile
          key={`${index}:${point.heading}`}
          point={point}
          index={index}
          labels={labels}
          // The third of three would sit alone on a tablet row, so it spans it.
          className={entryCount === 3 && index === 2 ? "col-span-full lg:col-span-4" : ENTRY_SPAN[entryCount]}
        />
      ))}

      {brief.startersMd.trim() ? (
        <StartersTile label={labels.conversation_starters ?? "Conversation Starters"} startersMd={brief.startersMd} />
      ) : null}
      {brief.referencesMd.trim() ? (
        <ReferencesTile label={labels.references ?? "References"} referencesMd={brief.referencesMd} />
      ) : null}
      {labels.confidential ? (
        <m.p variants={rise} className="micro-label col-span-full pt-3 text-center">
          {labels.confidential}
        </m.p>
      ) : null}
    </m.div>
  );
}
