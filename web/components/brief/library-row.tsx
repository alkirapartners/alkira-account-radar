"use client";

import { ChevronRight } from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";

import { Pill } from "@/components/ui/pill";
import { ScoreMeter } from "@/components/ui/score-meter";
import type { BriefSummary } from "@/lib/brief-types";
import { rise } from "@/lib/motion";
import { exactTime, relativeTime } from "@/lib/relative-time";

interface LibraryRowProps {
  brief: BriefSummary;
}

const FIT_SCALE = 5;

export function LibraryRow({ brief }: LibraryRowProps) {
  return (
    <m.li variants={rise} layout="position" className="border-b border-line last:border-b-0">
      <Link
        href={`/briefs/${brief.id}`}
        className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors duration-fast ease-out hover:bg-ink/[0.025] focus-visible:bg-ink/[0.025] sm:grid-cols-[minmax(0,1fr)_auto_7.5rem_auto] sm:gap-x-6 sm:px-7 sm:py-5"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-[15px] font-semibold tracking-heading sm:text-base">{brief.company}</span>
            {brief.language === "es" ? <Pill tone="neutral">Español</Pill> : null}
          </span>
          <span className="mt-1 hidden truncate text-sm text-ink-2 sm:block">
            {brief.snippet || "No summary was captured for this brief."}
          </span>
        </span>

        <span className="flex items-center gap-3 sm:justify-end">
          <ScoreMeter score={brief.score} scale={FIT_SCALE} size="md" />
          <span className="num w-7 text-right text-sm font-medium text-ink" aria-hidden="true">
            {brief.score > 0 ? brief.score : <span className="text-ink-3">&ndash;</span>}
            {brief.score > 0 ? <span className="text-ink-3">/{FIT_SCALE}</span> : null}
          </span>
        </span>

        <span className="col-span-2 truncate text-sm text-ink-2 sm:hidden">
          {brief.snippet || "No summary was captured for this brief."}
        </span>

        <time
          dateTime={brief.createdAt}
          title={exactTime(brief.createdAt)}
          className="text-[13px] text-ink-2 sm:text-right sm:text-sm"
        >
          {relativeTime(brief.createdAt)}
        </time>

        <ChevronRight
          aria-hidden="true"
          className="hidden h-4 w-4 text-ink-3 transition-[transform,color] duration-fast ease-out group-hover:translate-x-0.5 group-hover:text-ink sm:block"
        />
      </Link>
    </m.li>
  );
}
