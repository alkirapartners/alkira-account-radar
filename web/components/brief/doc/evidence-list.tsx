import { evidenceColumns, evidenceDate, saysUndated, type DateKind } from "@/lib/brief-doc";
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
  className?: string;
}

/** The mark beside each fact: solid for a dated one, haloed for a live posting, hollow for no date. */
const DOT: Record<DateKind, string> = {
  dated: "bg-accent",
  open: "bg-positive ring-4 ring-positive/15",
  undated: "border-[1.5px] border-dashed border-ink-3 bg-surface",
};

/** Whole class names per column count, so the stylesheet contains each of them. */
const COLUMNS: Record<1 | 2 | 3, string> = { 1: "", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3" };

/**
 * An angle's facts. Each leads with when its source is dated and the sources
 * it rests on. On a wide screen they run across the card in columns, so a long
 * list makes the card a little taller and not a lot.
 */
export function EvidenceList({ evidence, references, labels, language, sourceLabel, className }: EvidenceListProps) {
  if (evidence.length === 0) return null;

  return (
    <div className={className}>
      <h4 className="micro-label">{labels.evidence ?? "Evidence"}</h4>
      <ol className={cn("mt-4 grid gap-x-10 gap-y-6", COLUMNS[evidenceColumns(evidence.length)])}>
        {evidence.map((line, index) => {
          const state = evidenceDate(line, references, language);
          // A line that says "undated" itself is not also labelled so: once is enough. Its hollow mark stays.
          const isLabelled = state.kind !== "undated" || !saysUndated(line.text);
          return (
            <li key={index} className="relative pl-6">
              <span aria-hidden="true" className={cn("absolute left-0 top-[5px] h-2.5 w-2.5 rounded-full", DOT[state.kind])} />
              {isLabelled || line.sources.length > 0 ? (
                <p className="mb-1.5 flex min-h-[22px] flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  {isLabelled ? <DateStamp state={state} labels={labels} icon={false} /> : null}
                  <SourceChips sources={line.sources} references={references} label={sourceLabel} />
                </p>
              ) : null}
              <p className="max-w-[78ch] text-[15px] leading-relaxed text-ink">{line.text}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
