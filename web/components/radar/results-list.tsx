"use client";

import { AnimatePresence } from "motion/react";

import type { ResultRow as Row } from "@/lib/types";

import { ResultRow } from "./result-row";

interface ResultsListProps {
  rows: Row[];
  /** Order by score, highest first. Off while results are still arriving, so rows do not jump about. */
  sortByScore?: boolean;
  onDelete?: (id: string) => void;
}

export function ResultsList({ rows, sortByScore = false, onDelete }: ResultsListProps) {
  const ordered = sortByScore ? [...rows].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)) : rows;

  return (
    <section aria-label="Account scoring results" className="card overflow-hidden">
      <ul>
        <AnimatePresence initial={false} mode="popLayout">
          {ordered.map((row) => (
            <ResultRow key={row.id} row={row} onDelete={onDelete} />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
