"use client";

import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { splitStats } from "@/lib/brief-content";
import { hostOf, isWebAddress, readDoc } from "@/lib/brief-doc";
import { docCopy } from "@/lib/brief-doc-copy";
import { docSections } from "@/lib/brief-sections";
import type { BriefDetail, DocCompany } from "@/lib/brief-types";

import { BriefBento } from "./brief-bento";
import { BriefHeader } from "./brief-header";
import { DocBrief } from "./doc/doc-brief";
import { SectionNav } from "./doc/section-nav";

// The two layouts a brief can have. A response that carries a brief document
// gets the document layout; a legacy markdown brief keeps the bento it always had.

interface BriefTopProps {
  brief: BriefDetail;
  /** The date (YYYY-MM-DD) of the research this brief reused, if it did. */
  reusedFrom: string | null;
  actions: ReactNode;
}

/** The company's own site, opened in a new tab. Its ::after pad brings the touch target to 44px. */
function SiteLink({ href, host }: { href: string; host: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative inline-flex items-center gap-0.5 underline decoration-ink/20 underline-offset-[3px] transition-colors duration-fast after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] hover:text-accent hover:decoration-accent"
    >
      {host}
      <ArrowUpRight
        className="h-3.5 w-3.5 transition-transform duration-fast ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </a>
  );
}

/** Which company the brief resolved: its legal entity, how it is owned, its site, and a note when names collide. */
function Identity({ company, name, ownership, label }: { company: DocCompany; name: string; ownership: string; label: string }) {
  const legalName = company.legalName.trim();
  const website = company.website.trim();
  const host = isWebAddress(website) ? hostOf(website) : "";
  const note = company.identityNote.trim();
  // The legal name is left out when it only repeats the heading above it.
  const isSameName = legalName.toLowerCase() === name.trim().toLowerCase();
  const facts: ReactNode[] = [
    legalName && !isSameName ? <span className="font-medium text-ink">{legalName}</span> : null,
    ownership ? <span>{ownership}</span> : null,
    host ? <SiteLink href={website} host={host} /> : null,
  ].filter(Boolean);

  if (facts.length === 0 && !note) return null;

  return (
    <div className="mt-3.5 text-sm text-ink-2">
      {facts.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {facts.map((fact, index) => (
            <span key={index} className="inline-flex items-center gap-x-2.5">
              {fact}
              {index < facts.length - 1 ? <span aria-hidden="true" className="h-[3px] w-[3px] rounded-full bg-ink-3" /> : null}
            </span>
          ))}
        </p>
      ) : null}
      {note ? (
        <p className="mt-2 max-w-[72ch] text-[13px] leading-relaxed">
          <span className="font-medium text-ink">{label}:</span> {note}
        </p>
      ) : null}
    </div>
  );
}

export function BriefTop({ brief, reusedFrom, actions }: BriefTopProps) {
  const doc = readDoc(brief);
  if (!doc) return <BriefHeader brief={brief} reusedFrom={reusedFrom} actions={actions} />;

  // Ownership moves from the pills to the identity line, where the entity and its listing read as one fact.
  const ownershipLabel = brief.labels.stat_ownership ?? "Ownership";
  const stats = splitStats(brief.statsLine);
  const ownership = stats.find((stat) => stat.label === ownershipLabel)?.value ?? doc.company.ticker.trim();

  return (
    <BriefHeader
      brief={brief}
      reusedFrom={reusedFrom}
      actions={actions}
      stats={stats.filter((stat) => stat.label !== ownershipLabel)}
      identity={
        <Identity company={doc.company} name={brief.company} ownership={ownership} label={brief.labels.identity ?? "Which company"} />
      }
    />
  );
}

export function BriefBody({ brief }: { brief: BriefDetail }) {
  const doc = readDoc(brief);
  return doc ? <DocBrief brief={brief} doc={doc} /> : <BriefBento brief={brief} />;
}

/** True when the brief gets the document layout, which is long enough to want its jump nav. */
export function hasDocLayout(brief: BriefDetail): boolean {
  return readDoc(brief) !== null;
}

/** The jump nav for the pinned bar. Nothing for a legacy brief. */
export function BriefNav({ brief }: { brief: BriefDetail }) {
  const doc = readDoc(brief);
  if (!doc) return null;
  const copy = docCopy(brief.language);
  return <SectionNav sections={docSections(doc, brief.labels, copy)} label={copy.onThisPage} />;
}
