"use client";

import { Markdown } from "@/components/ui/markdown";

import { Tile } from "./tile";

interface SignalsTileProps {
  label: string;
  signals: string[];
  /** Spans the full row when there are no infrastructure tiles beside it. */
  wide: boolean;
}

export function SignalsTile({ label, signals, wide }: SignalsTileProps) {
  return (
    <Tile label={label} className={wide ? "col-span-full" : "col-span-full lg:col-span-5"}>
      <ul className="mt-5 space-y-4">
        {signals.map((signal, index) => (
          <li key={index} className="flex gap-3.5">
            <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <Markdown className="text-[15px] leading-relaxed text-ink">{signal}</Markdown>
          </li>
        ))}
      </ul>
    </Tile>
  );
}
