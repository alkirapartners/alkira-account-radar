"use client";

import { ArrowLeft, History } from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Pill } from "@/components/ui/pill";
import { splitStats } from "@/lib/brief-content";
import type { BriefDetail } from "@/lib/brief-types";
import { rise } from "@/lib/motion";
import { exactTime, relativeTime } from "@/lib/relative-time";

interface BriefHeaderProps {
  brief: BriefDetail;
  /** The date (YYYY-MM-DD) of the research this brief reused, if it did. */
  reusedFrom: string | null;
  actions: ReactNode;
}

const REUSED_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function formatReusedDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "" : REUSED_FORMAT.format(date);
}

export function BriefHeader({ brief, reusedFrom, actions }: BriefHeaderProps) {
  const stats = splitStats(brief.statsLine);
  const reusedDate = reusedFrom ? formatReusedDate(reusedFrom) : "";

  return (
    <m.header variants={rise}>
      <Link
        href="/"
        className="group inline-flex h-9 items-center gap-1.5 rounded-full pr-3 text-sm font-medium text-ink-2 transition-colors duration-fast hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4 transition-transform duration-fast ease-out group-hover:-translate-x-0.5" aria-hidden="true" />
        Your briefs
      </Link>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
        <div className="min-w-0">
          <h1 className="text-[clamp(2rem,1.2rem+3vw,3.25rem)] font-semibold leading-[1.05] tracking-display [overflow-wrap:anywhere]">
            {brief.company}
          </h1>

          {stats.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {stats.map((stat) => (
                <li
                  key={`${stat.label}:${stat.value}`}
                  className="flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13px]"
                >
                  {stat.label ? <span className="text-ink-2">{stat.label}</span> : null}
                  <span className="font-medium text-ink">{stat.value}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-2">
            <time dateTime={brief.createdAt} title={exactTime(brief.createdAt)}>
              Researched {relativeTime(brief.createdAt)}
            </time>
            {brief.language === "es" ? <Pill tone="neutral">Español</Pill> : null}
            {reusedDate ? (
              <Pill tone="warning">
                <History className="h-3.5 w-3.5" aria-hidden="true" />
                Reused research from {reusedDate}. Update the brief for fresh research.
              </Pill>
            ) : null}
          </div>
        </div>
        {actions}
      </div>
    </m.header>
  );
}
