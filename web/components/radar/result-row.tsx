"use client";

import { ArrowRight, Trash2 } from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";
import type { Route } from "next";

import { buttonClasses } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { ScoreMeter } from "@/components/ui/score-meter";
import { Skeleton } from "@/components/ui/skeleton";
import { DUR, EASE_IN, EASE_OUT, SPRING_LAYOUT } from "@/lib/motion";
import { briefHref, rowState } from "@/lib/row-state";
import { BAND_LABEL, BAND_TONE, scoreBand } from "@/lib/score-color";
import type { ResultRow as Row } from "@/lib/types";

interface ResultRowProps {
  row: Row;
  onDelete?: (id: string) => void;
}

const SCORE_SCALE = 10;

export function ResultRow({ row, onDelete }: ResultRowProps) {
  const state = rowState(row);
  const handoff = briefHref(row);
  const name = row.resolved_name ?? row.account_name;
  // A row still streaming in has no reasons field yet.
  const reasons = row.reasons ?? [];
  const band = scoreBand(row.score);

  return (
    <m.li
      layout
      transition={SPRING_LAYOUT}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT } }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: DUR.fast, ease: EASE_IN } }}
      className="border-b border-line bg-surface last:border-b-0"
    >
      <article className="grid gap-x-6 gap-y-3 px-5 py-5 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:px-7 sm:py-6">
        <div className="flex items-center gap-4 sm:row-span-2 sm:block">
          {state === "pending" ? (
            <>
              <Skeleton className="h-10 w-12" />
              <Skeleton className="h-3 w-[70px] sm:mt-3" />
            </>
          ) : (
            <>
              <p className="text-[44px] font-semibold tabular-nums leading-none tracking-display" aria-hidden="true">
                {row.score ?? <span className="text-ink-2">&ndash;</span>}
              </p>
              {/* Keyed on the score so the ticks fill when the result lands. */}
              <ScoreMeter key={String(row.score)} score={row.score} scale={SCORE_SCALE} size="sm" animate className="sm:mt-3" />
            </>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <h3 className="text-[17px] font-semibold leading-tight tracking-heading">{name}</h3>
            {state === "scored" ? <Pill tone={BAND_TONE[band]}>{BAND_LABEL[band]}</Pill> : null}
          </div>
          {row.resolved_domain ? <p className="mt-1 text-sm text-ink-2">{row.resolved_domain}</p> : null}
        </div>

        <div className="flex items-start gap-2 sm:col-start-3 sm:row-start-1">
          {handoff ? (
            <Link href={handoff as Route} className={buttonClasses("secondary", "sm", "group flex-1 sm:flex-none")}>
              Generate brief
              <ArrowRight className="h-4 w-4 transition-transform duration-fast ease-out group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ) : null}
          {onDelete && state !== "pending" ? (
            <button
              type="button"
              onClick={() => onDelete(row.id)}
              aria-label={`Delete result for ${name}`}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-2 transition-[background-color,color,transform] duration-fast ease-out after:absolute after:-inset-1 after:content-[''] hover:bg-negative-tint hover:text-negative active:scale-90"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="min-w-0 sm:col-span-2 sm:col-start-2">
          {state === "pending" ? (
            <p className="text-sm text-ink-2" role="status">
              Scoring&hellip;
            </p>
          ) : state === "error" ? (
            <p className="text-sm text-negative" role="alert">
              {row.error_message ?? "Failed to score this account."}
            </p>
          ) : state === "unscored" ? (
            <p className="max-w-prose text-sm leading-relaxed text-ink-2">
              Not enough is known about this account for a quick score. Generate a brief to research it.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {reasons.map((reason, index) => (
                <li key={index} className="flex gap-3 text-[15px] leading-relaxed text-ink">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  {reason}
                </li>
              ))}
            </ul>
          )}
        </div>

      </article>
    </m.li>
  );
}
