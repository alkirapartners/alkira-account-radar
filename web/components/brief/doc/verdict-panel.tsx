"use client";

import { Cloudy } from "lucide-react";
import { m } from "motion/react";

import { CountUp } from "@/components/ui/count-up";
import { Pill } from "@/components/ui/pill";
import { ScoreMeter } from "@/components/ui/score-meter";
import { splitLead } from "@/lib/brief-doc";
import type { BriefDoc } from "@/lib/brief-types";
import { rise } from "@/lib/motion";
import { FIT_LABEL, fitTier } from "@/lib/score";

import { AmbientPanel } from "../ambient-panel";

interface VerdictPanelProps {
  doc: BriefDoc;
  labels: Record<string, string>;
}

const FIT_SCALE = 5;
/** Starts the count once the panel itself has arrived. */
const COUNT_DELAY_MS = 220;
const HEADING_ID = "fit-heading";
const EYEBROW = "text-[11px] font-semibold uppercase leading-none tracking-[0.09em] text-accent-soft";

/**
 * The thirty-second answer, on the one dark surface: the score and why, what
 * to open with and whom to call, and what the company runs.
 */
export function VerdictPanel({ doc, labels }: VerdictPanelProps) {
  const { score, verdict } = doc.fit;
  const tier = fitTier(score, FIT_SCALE);
  const fitLabel = labels.alkira_fit ?? "Alkira Fit";
  const lead = splitLead(doc.fit.lead);
  const cloudNetwork = doc.stats.cloudNetwork.trim();

  return (
    <m.section variants={rise} aria-labelledby={HEADING_ID}>
      <AmbientPanel quiet>
        <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] lg:gap-0 lg:p-10">
          <div className="lg:pr-10">
            <h2 id={HEADING_ID} className={EYEBROW}>
              {fitLabel}
            </h2>
            <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-4">
              <p className="flex items-baseline gap-2 font-semibold leading-none tracking-display">
                {tier === "none" ? (
                  <span className="text-[64px] text-on-ambient-2 sm:text-[80px]">&ndash;</span>
                ) : (
                  <CountUp value={score} durationMs={900} delayMs={COUNT_DELAY_MS} className="text-[64px] sm:text-[80px]" />
                )}
                <span className="text-xl font-medium tracking-normal text-on-ambient-2">/ {FIT_SCALE}</span>
              </p>
              <div className="flex items-center gap-3.5 pb-1.5">
                <ScoreMeter
                  score={score}
                  scale={FIT_SCALE}
                  size="lg"
                  tone="ambient"
                  animate
                  delay={COUNT_DELAY_MS / 1000}
                  subject={fitLabel}
                />
                <Pill tone="ambient">{FIT_LABEL[tier]}</Pill>
              </div>
            </div>
            {verdict.trim() ? (
              <p className="mt-6 max-w-[58ch] text-[15px] leading-relaxed text-on-ambient/80">{verdict}</p>
            ) : null}
          </div>

          {lead.first ? (
            <div className="border-t border-white/10 pt-7 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <h3 className={EYEBROW}>{labels.lead ?? "Lead with"}</h3>
              <p className="mt-5 text-[clamp(1.375rem,1.05rem+1.25vw,1.875rem)] font-medium leading-[1.3] tracking-heading [text-wrap:pretty]">
                <span>{lead.first}</span>
                {lead.rest ? <span className="text-on-ambient/70"> {lead.rest}</span> : null}
              </p>
            </div>
          ) : null}
        </div>

        {cloudNetwork ? (
          <div className="flex flex-col gap-2.5 border-t border-white/10 px-6 py-5 sm:flex-row sm:items-baseline sm:gap-6 sm:px-9 lg:px-10">
            <h3 className={`${EYEBROW} flex shrink-0 items-center gap-2 sm:translate-y-[-1px]`}>
              <Cloudy className="h-4 w-4" aria-hidden="true" />
              {labels.stat_cloud_network ?? "Cloud and network"}
            </h3>
            <p className="text-[15px] font-medium leading-relaxed text-on-ambient sm:text-base">{cloudNetwork}</p>
          </div>
        ) : null}
      </AmbientPanel>
    </m.section>
  );
}
