// The sections of the document layout that the jump nav lists, and which of
// them the reader is in. Pure: the scrolling itself is watched in
// hooks/use-active-section.ts.

import type { DocCopy } from "./brief-doc-copy";
import type { BriefDoc } from "./brief-types";

/** The anchors the jump nav links to. Each is the id of that section's element. */
export const SECTION_ID = {
  whyNow: "why-now",
  ask: "ask-this",
  engineer: "engineer",
  people: "who-to-talk-to",
  references: "references",
} as const;

export interface DocSection {
  id: string;
  label: string;
}

/** The sections this document will show, in page order. One with nothing in it is not listed. */
export function docSections(doc: BriefDoc, labels: Record<string, string>, copy: DocCopy): DocSection[] {
  const sections: Array<DocSection | false> = [
    doc.angles.length > 0 && { id: SECTION_ID.whyNow, label: copy.navWhyNow },
    doc.questions.length > 0 && { id: SECTION_ID.ask, label: copy.askThis },
    { id: SECTION_ID.engineer, label: copy.forEngineer },
    doc.people.length > 0 && { id: SECTION_ID.people, label: labels.who_to_talk_to ?? "Who to talk to" },
    doc.references.length > 0 && { id: SECTION_ID.references, label: labels.references ?? "References" },
  ];
  return sections.filter((section): section is DocSection => section !== false);
}

interface ReadingState {
  /** Section ids in page order. */
  order: readonly string[];
  /** The sections crossing the reading line right now. */
  inBand: ReadonlySet<string>;
  /** The anchor in the address, without its "#": the section the reader last jumped to, if it is one. */
  chosen: string;
  /** True when the last section is wholly in view, as it is at the foot of the page. */
  isEndInView: boolean;
  previous: string | null;
}

/**
 * Which section the reader is in.
 *
 * It is the one crossing the reading line. Two sections side by side cross it
 * together: the one the reader jumped to wins, else the earlier. At the foot of
 * the page the last section may be too short to reach the line, so being wholly
 * in view is enough for it. Between sections, the last one read stays current.
 */
export function resolveSection({ order, inBand, chosen, isEndInView, previous }: ReadingState): string | null {
  if (inBand.has(chosen) && order.includes(chosen)) return chosen;
  if (isEndInView && order.length > 0) return order[order.length - 1];
  return order.find((id) => inBand.has(id)) ?? previous;
}
