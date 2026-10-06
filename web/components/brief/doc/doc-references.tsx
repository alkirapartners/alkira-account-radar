"use client";

import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { m } from "motion/react";
import type { ReactNode } from "react";

import { Pill, type PillTone } from "@/components/ui/pill";
import { displayUrl, isWebAddress, referenceDate, referenceTitle, sentenceCase } from "@/lib/brief-doc";
import type { DocCopy } from "@/lib/brief-doc-copy";
import { SECTION_ID } from "@/lib/brief-sections";
import type { DocReference, SourceType } from "@/lib/brief-types";
import { rise } from "@/lib/motion";

import { DateStamp } from "./date-stamp";
import { referenceAnchor } from "./source-chips";

interface DocReferencesProps {
  references: readonly DocReference[];
  labels: Record<string, string>;
  language: string;
  copy: DocCopy;
}

const HEADING_ID = "references-heading";
// The row is wider than its list by its own padding, so the hover and "landed here" tints have
// room around the text while the hairlines between rows stay on the page's edge.
const ROW =
  "group -mx-3 flex items-start gap-3.5 rounded-inner px-3 py-4 text-sm transition-colors duration-base ease-out sm:gap-4";

const TYPE_TONE: Record<SourceType, PillTone> = {
  first_hand: "positive",
  second_hand: "warning",
  last_resort: "negative",
};

function typeLabel(type: SourceType, labels: Record<string, string>, copy: DocCopy): string {
  if (type === "second_hand") return sentenceCase(labels.source_second_hand ?? "second-hand");
  if (type === "last_resort") return sentenceCase(labels.source_last_resort ?? "last-resort source");
  return copy.firstHand;
}

/** A link for a web address; plain text for anything else, which is never made clickable. */
function ReferenceRow({ url, newTab, children }: { url: string; newTab: string; children: ReactNode }) {
  if (!isWebAddress(url)) return <div className={ROW}>{children}</div>;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`${ROW} hover:bg-ink/[0.03]`}>
      {children}
      <span className="sr-only">({newTab})</span>
      <ArrowUpRight
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-ink-3 transition-[transform,color] duration-fast ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
      />
    </a>
  );
}

type ReferenceItemProps = Omit<DocReferencesProps, "references"> & { reference: DocReference };

/** One source: its number, title and address, then how close it is to the company and how it is dated. */
function ReferenceItem({ reference, labels, language, copy }: ReferenceItemProps) {
  const type = reference.sourceType;

  return (
    <li id={referenceAnchor(reference.n)} className="scroll-mt-16 border-b border-line [&:target>*]:bg-accent/[0.08]">
      <ReferenceRow url={reference.url} newTab={copy.newTab}>
        <span className="num w-6 shrink-0 pt-px text-xs leading-5 text-ink-2">{String(reference.n).padStart(2, "0")}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <span className="min-w-0">
            <span className="block font-medium leading-snug text-ink transition-colors duration-fast [overflow-wrap:anywhere] group-hover:text-accent">
              {referenceTitle(reference, labels)}
            </span>
            <span className="mt-1 line-clamp-2 break-all text-[13px] leading-snug text-ink-2">{displayUrl(reference.url)}</span>
          </span>
          <span className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 lg:grid lg:w-[21rem] lg:grid-cols-[7.5rem_minmax(0,1fr)]">
            <span>
              <Pill tone={TYPE_TONE[type]}>
                {type === "first_hand" ? <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                {typeLabel(type, labels, copy)}
              </Pill>
            </span>
            <DateStamp state={referenceDate(reference, language)} labels={labels} />
          </span>
        </span>
      </ReferenceRow>
    </li>
  );
}

/**
 * The sources, numbered as the chips above cite them. Each row says how close
 * the source is to the company and how it is dated. A title wraps in full; an
 * address breaks anywhere and is cut at two lines (the link carries all of it),
 * so neither can push the row wider than the screen. A chip that jumps here
 * tints the row it lands on.
 */
export function DocReferences({ references, labels, language, copy }: DocReferencesProps) {
  return (
    <m.section variants={rise} id={SECTION_ID.references} aria-labelledby={HEADING_ID} className="scroll-mt-16">
      <h2 id={HEADING_ID} className="text-xl font-semibold tracking-heading">
        {labels.references ?? "References"}
      </h2>

      <ol className="mt-4 border-t border-line">
        {references.map((reference) => (
          <ReferenceItem key={reference.n} reference={reference} labels={labels} language={language} copy={copy} />
        ))}
      </ol>
    </m.section>
  );
}
