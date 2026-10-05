"use client";

import type { EntryPoint } from "@/lib/brief-types";

import { Tile } from "./tile";

interface EntryPointTileProps {
  point: EntryPoint;
  index: number;
  labels: Record<string, string>;
  className?: string;
}

const ROWS: ReadonlyArray<{ key: "signal" | "solution" | "proof"; fallback: string }> = [
  { key: "signal", fallback: "Signal" },
  { key: "solution", fallback: "Solution" },
  { key: "proof", fallback: "Proof" },
];

export function EntryPointTile({ point, index, labels, className }: EntryPointTileProps) {
  const headingId = `entry-point-${index}`;
  const number = String(index + 1).padStart(2, "0");
  const rows = ROWS.filter((row) => point[row.key]);
  // Older briefs hold one undivided paragraph; a lone "Signal" label over it would mislabel it.
  const showLabels = rows.length > 1;

  return (
    <Tile labelledBy={headingId} className={className}>
      <p className="flex items-center gap-2.5">
        <span className="num flex h-7 items-center rounded-full bg-ink px-2.5 text-xs font-medium text-white">{number}</span>
        <span className="micro-label">{labels.entry ?? "Entry"}</span>
      </p>
      <h2 id={headingId} className="mt-4 text-xl font-semibold leading-snug tracking-heading">
        {point.heading}
      </h2>
      {showLabels ? (
        <dl className="mt-5 divide-y divide-line border-t border-line">
          {rows.map((row) => (
            <div key={row.key} className="py-4 last:pb-0">
              <dt className="micro-label">{labels[row.key] ?? row.fallback}</dt>
              <dd className="mt-2 text-[15px] leading-relaxed text-ink">{point[row.key]}</dd>
            </div>
          ))}
        </dl>
      ) : (
        rows.map((row) => (
          <p key={row.key} className="mt-5 border-t border-line pt-4 text-[15px] leading-relaxed text-ink">
            {point[row.key]}
          </p>
        ))
      )}
    </Tile>
  );
}
