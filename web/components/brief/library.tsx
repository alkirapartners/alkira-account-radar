"use client";

import { FileText, Globe, RotateCw, Search, SearchX, Type } from "lucide-react";
import { m } from "motion/react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl, type SegmentOption } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import type { BriefSummary } from "@/lib/brief-types";
import { rise, stagger } from "@/lib/motion";

import { LibraryRow } from "./library-row";

export type LibrarySort = "newest" | "fit";

interface LibraryProps {
  briefs: BriefSummary[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  sort: LibrarySort;
  onSortChange: (sort: LibrarySort) => void;
}

const SORTS: SegmentOption<LibrarySort>[] = [
  { value: "newest", label: "Newest" },
  { value: "fit", label: "Highest fit" },
];

const SKELETON_ROWS = 5;

const HOW_IT_WORKS = [
  { icon: Type, title: "Enter a company", text: "Any company name. Nothing else is needed." },
  { icon: Globe, title: "It gets researched", text: "It works out exactly which company you mean, then searches and reads sources and checks the evidence." },
  { icon: FileText, title: "You get a scored brief", text: "Alkira fit from 1 to 5, entry points, proof and questions." },
];

/** Filter by company name, then order. Pure, so it can be tested without rendering. */
export function arrangeBriefs(briefs: BriefSummary[], query: string, sort: LibrarySort): BriefSummary[] {
  const wanted = query.trim().toLowerCase();
  const matching = wanted ? briefs.filter((brief) => brief.company.toLowerCase().includes(wanted)) : briefs;
  return [...matching].sort((a, b) =>
    sort === "fit" ? b.score - a.score || b.createdAt.localeCompare(a.createdAt) : b.createdAt.localeCompare(a.createdAt),
  );
}

function LibrarySkeleton() {
  return (
    <ul aria-hidden="true">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <li key={index} className="flex items-center gap-6 border-b border-line px-5 py-5 last:border-b-0 sm:px-7">
          <span className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-4 w-44 max-w-full" />
            <Skeleton className="hidden h-3.5 w-[70%] sm:block" />
          </span>
          <Skeleton className="h-[18px] w-24" />
          <Skeleton className="hidden h-3.5 w-20 sm:block" />
        </li>
      ))}
    </ul>
  );
}

function FirstRun() {
  return (
    <div className="px-6 py-10 sm:px-10 sm:py-12">
      <h3 className="text-lg font-semibold tracking-heading">Your briefs will collect here</h3>
      <p className="mt-1.5 text-[15px] text-ink-2">Generate your first one above. Here is what happens when you do.</p>
      <ol className="mt-8 grid gap-6 sm:grid-cols-3 sm:gap-8">
        {HOW_IT_WORKS.map((step, index) => (
          <li key={step.title} className="flex gap-4 sm:block">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-accent/10 text-accent" aria-hidden="true">
              <step.icon className="h-5 w-5" />
            </span>
            <span className="block sm:mt-4">
              <span className="num block text-xs text-ink-2">0{index + 1}</span>
              <span className="mt-1 block font-semibold">{step.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-ink-2">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Library({ briefs, isLoading, isError, onRetry, query, onQueryChange, sort, onSortChange }: LibraryProps) {
  const total = briefs?.length ?? 0;
  const shown = briefs ? arrangeBriefs(briefs, query, sort) : [];
  const hasControls = total > 0;

  return (
    <m.section variants={rise} aria-labelledby="library-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-baseline gap-3">
          <h2 id="library-heading" className="text-2xl font-semibold tracking-heading">
            Your briefs
          </h2>
          {hasControls ? <span className="num text-sm text-ink-2">{total}</span> : null}
        </div>

        {hasControls ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex h-11 items-center gap-2.5 rounded-full border border-line-strong bg-surface px-4 transition-[border-color,box-shadow] duration-fast ease-out focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 sm:w-64">
              <Search className="h-4 w-4 shrink-0 text-ink-2" aria-hidden="true" />
              <span className="sr-only">Search your briefs</span>
              <input
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search by company"
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-2 [&::-webkit-search-cancel-button]:hidden"
              />
            </label>
            <SegmentedControl label="Sort briefs" options={SORTS} value={sort} onChange={onSortChange} className="self-start" />
          </div>
        ) : null}
      </div>

      <div className="card mt-5 overflow-hidden">
        {isLoading ? (
          <LibrarySkeleton />
        ) : isError ? (
          <EmptyState
            icon={<RotateCw className="h-6 w-6" />}
            title="Your briefs didn't load"
            description="This is usually a brief network hiccup. Your briefs are safe."
            action={
              <Button variant="secondary" onClick={onRetry}>
                Try again
              </Button>
            }
          />
        ) : total === 0 ? (
          <FirstRun />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<SearchX className="h-6 w-6" />}
            title={`No briefs match “${query.trim()}”`}
            description="Check the spelling, or clear the search to see everything."
            action={
              <Button variant="secondary" onClick={() => onQueryChange("")}>
                Clear search
              </Button>
            }
          />
        ) : (
          <m.ul variants={stagger(0.035)} initial="hidden" animate="shown">
            {shown.map((brief) => (
              <LibraryRow key={brief.id} brief={brief} />
            ))}
          </m.ul>
        )}
      </div>
    </m.section>
  );
}
