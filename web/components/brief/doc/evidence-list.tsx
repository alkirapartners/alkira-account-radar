import { evidenceDate, type DateKind } from "@/lib/brief-doc";
import type { DocEvidenceLine, DocReference } from "@/lib/brief-types";
import { cn } from "@/lib/cn";

import { DateStamp } from "./date-stamp";
import { SourceChips } from "./source-chips";

interface EvidenceListProps {
  evidence: readonly DocEvidenceLine[];
  references: readonly DocReference[];
  labels: Record<string, string>;
  language: string;
  /** "Source {n}", in the brief's language. */
  sourceLabel: string;
}

/** The timeline mark for each date state: solid for a dated fact, haloed for a live posting, hollow for no date. */
const DOT: Record<DateKind, string> = {
  dated: "bg-accent",
  open: "bg-positive ring-4 ring-positive/15",
  undated: "border-[1.5px] border-dashed border-ink-3 bg-surface",
};

/**
 * An angle's facts as a short timeline. Each fact leads with when its source
 * is dated and the sources it rests on, so "why now" can be read down the rail.
 */
export function EvidenceList({ evidence, references, labels, language, sourceLabel }: EvidenceListProps) {
  return (
    <ol>
      {evidence.map((line, index) => {
        const state = evidenceDate(line, references, language);
        const isLast = index === evidence.length - 1;
        return (
          <li key={index} className={cn("relative pl-6", !isLast && "pb-5")}>
            {isLast ? null : <span aria-hidden="true" className="absolute bottom-0 left-[4.5px] top-4 w-px bg-line-strong" />}
            <span aria-hidden="true" className={cn("absolute left-0 top-[5px] h-2.5 w-2.5 rounded-full", DOT[state.kind])} />
            <p className="flex min-h-[22px] flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <DateStamp state={state} labels={labels} icon={false} />
              <SourceChips sources={line.sources} references={references} label={sourceLabel} />
            </p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{line.text}</p>
          </li>
        );
      })}
    </ol>
  );
}
