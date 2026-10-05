"use client";

import { ArrowRight, FileText, Globe, Type } from "lucide-react";
import Link from "next/link";

import { ScoreMeter } from "@/components/ui/score-meter";
import { Skeleton } from "@/components/ui/skeleton";
import type { BriefSummary } from "@/lib/brief-types";
import { relativeTime } from "@/lib/relative-time";
import { FIT_LABEL, fitTier } from "@/lib/score";

interface HeroAsideProps {
  /** The partner's most recent brief; undefined while loading, null when they have none. */
  latest: BriefSummary | null | undefined;
}

const FIT_SCALE = 5;

const GLASS =
  "rounded-[22px] border border-white/10 bg-white/[0.06] p-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-md";

const WHAT_YOU_GET = [
  { icon: Type, text: "Type any company name" },
  { icon: Globe, text: "Eight searches, the best five pages read" },
  { icon: FileText, text: "A fit score, three entry points, questions to ask" },
];

/** The right side of the generate box: the latest brief to pick back up, or what to expect on a first visit. */
export function HeroAside({ latest }: HeroAsideProps) {
  if (latest === undefined) {
    return (
      <div className={GLASS} aria-hidden="true">
        <Skeleton tone="ambient" className="h-3 w-24" />
        <Skeleton tone="ambient" className="mt-5 h-6 w-48" />
        <Skeleton tone="ambient" className="mt-5 h-[18px] w-32" />
        <Skeleton tone="ambient" className="mt-6 h-3.5 w-full" />
        <Skeleton tone="ambient" className="mt-2 h-3.5 w-[80%]" />
      </div>
    );
  }

  if (latest === null) {
    return (
      <div className={GLASS}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.09em] text-accent-soft">How it works</h2>
        <ol className="mt-5 space-y-4">
          {WHAT_YOU_GET.map((step) => (
            <li key={step.text} className="flex items-center gap-3.5 text-[15px] text-on-ambient">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-white/10 text-accent-soft" aria-hidden="true">
                <step.icon className="h-[18px] w-[18px]" />
              </span>
              {step.text}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const tier = fitTier(latest.score, FIT_SCALE);

  return (
    <Link
      href={`/briefs/${latest.id}`}
      className={`group block transition-[transform,background-color,border-color] duration-base ease-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.09] ${GLASS}`}
    >
      <p className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-accent-soft">Latest brief</span>
        <span className="text-[13px] text-on-ambient-2">{relativeTime(latest.createdAt)}</span>
      </p>
      <h2 className="mt-4 truncate text-2xl font-semibold tracking-heading text-on-ambient">{latest.company}</h2>
      <p className="mt-4 flex items-center gap-3">
        <ScoreMeter score={latest.score} scale={FIT_SCALE} size="md" tone="ambient" animate delay={0.35} />
        <span className="text-sm text-on-ambient">
          {tier === "none" ? FIT_LABEL.none : (
            <>
              <span className="num">{latest.score}/{FIT_SCALE}</span>
              <span className="text-on-ambient-2"> · {FIT_LABEL[tier]}</span>
            </>
          )}
        </span>
      </p>
      {latest.snippet ? (
        <p className="mt-5 line-clamp-3 text-sm leading-relaxed text-on-ambient-2">{latest.snippet}</p>
      ) : null}
      <p className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-on-ambient">
        Open brief
        <ArrowRight className="h-4 w-4 transition-transform duration-fast ease-out group-hover:translate-x-1" aria-hidden="true" />
      </p>
    </Link>
  );
}
