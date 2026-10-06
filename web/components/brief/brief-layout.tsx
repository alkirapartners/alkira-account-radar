"use client";

import { useCallback, useState, type ReactNode } from "react";

import { ErrorBoundary } from "@/components/ui/error-boundary";
import { splitStats } from "@/lib/brief-content";
import { docCopy } from "@/lib/brief-doc-copy";
import { docSections } from "@/lib/brief-sections";
import type { BriefDetail } from "@/lib/brief-types";
import { readDoc } from "@/lib/read-brief-doc";

import { BriefBento } from "./brief-bento";
import { BriefHeader } from "./brief-header";
import { DocBrief } from "./doc/doc-brief";
import { IdentityLine } from "./doc/identity-line";
import { SectionNav } from "./doc/section-nav";

// The two layouts a brief can have. A response that carries a brief document
// gets the document layout; a legacy markdown brief keeps the bento it always had.
//
// Every response also carries the legacy fields, so the bento can always be
// drawn. If any part of the document layout throws while rendering, that part
// falls back to its legacy form and reports it; the page then draws all of
// itself the legacy way, so the reader gets one whole brief and never a blank page.

interface LayoutGuard {
  /** True once the document layout has failed for this brief: draw from the legacy fields. */
  forceLegacy?: boolean;
  /** Called when a part of the document layout fails to render. */
  onLayoutError?: () => void;
}

interface BriefTopProps extends LayoutGuard {
  brief: BriefDetail;
  /** The date (YYYY-MM-DD) of the research this brief reused, if it did. */
  reusedFrom: string | null;
  actions: ReactNode;
}

interface BriefPartProps extends LayoutGuard {
  brief: BriefDetail;
}

/**
 * Whether the document layout has failed for a brief, and the callback that
 * records it. Shared by the page's header, nav and body so they change over
 * together. A different brief starts clean.
 */
export function useLayoutFailure(briefId: string): [boolean, () => void] {
  const [failedId, setFailedId] = useState<string | null>(null);
  const report = useCallback(() => setFailedId(briefId), [briefId]);
  return [failedId === briefId, report];
}

/** True when the brief gets the document layout, which is long enough to want its jump nav. */
export function hasDocLayout(brief: BriefDetail): boolean {
  return readDoc(brief) !== null;
}

export function BriefTop({ brief, reusedFrom, actions, forceLegacy = false, onLayoutError }: BriefTopProps) {
  const legacy = <BriefHeader brief={brief} reusedFrom={reusedFrom} actions={actions} />;
  const doc = forceLegacy ? null : readDoc(brief);
  if (!doc) return legacy;

  // Ownership moves from the pills to the identity line, where the entity and its listing read as one fact.
  const ownershipLabel = brief.labels.stat_ownership ?? "Ownership";
  const stats = splitStats(brief.statsLine);
  const ownership = stats.find((stat) => stat.label === ownershipLabel)?.value ?? doc.company.ticker.trim();

  return (
    <ErrorBoundary key={brief.id} fallback={legacy} onError={onLayoutError}>
      <BriefHeader
        brief={brief}
        reusedFrom={reusedFrom}
        actions={actions}
        stats={stats.filter((stat) => stat.label !== ownershipLabel)}
        identity={
          <IdentityLine company={doc.company} name={brief.company} ownership={ownership} label={brief.labels.identity ?? "Which company"} />
        }
      />
    </ErrorBoundary>
  );
}

export function BriefBody({ brief, forceLegacy = false, onLayoutError }: BriefPartProps) {
  const legacy = <BriefBento brief={brief} />;
  const doc = forceLegacy ? null : readDoc(brief);
  if (!doc) return legacy;

  return (
    <ErrorBoundary key={brief.id} fallback={legacy} onError={onLayoutError}>
      <DocBrief brief={brief} doc={doc} />
    </ErrorBoundary>
  );
}

/** The jump nav for the pinned bar. Nothing for a legacy brief, or if the nav itself fails. */
export function BriefNav({ brief, forceLegacy = false, onLayoutError }: BriefPartProps) {
  const doc = forceLegacy ? null : readDoc(brief);
  if (!doc) return null;
  const copy = docCopy(brief.language);

  return (
    <ErrorBoundary key={brief.id} fallback={null} onError={onLayoutError}>
      <SectionNav sections={docSections(doc, brief.labels, copy)} label={copy.onThisPage} />
    </ErrorBoundary>
  );
}
