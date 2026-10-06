"use client";

import {
  BrickWall,
  CircleCheck,
  Cloudy,
  Globe,
  Handshake,
  Hourglass,
  Merge,
  Network,
  Store,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { m } from "motion/react";

import { Pill } from "@/components/ui/pill";
import { readableDate } from "@/lib/brief-doc";
import { fill, useCaseLabel, type DocCopy } from "@/lib/brief-doc-copy";
import type { DocAngle, DocReference } from "@/lib/brief-types";
import { rise } from "@/lib/motion";

import { EvidenceList } from "./evidence-list";
import { ProofPlate } from "./proof-plate";

interface AngleCardProps {
  angle: DocAngle;
  /** Counting from 1, as questions refer to it. */
  number: number;
  references: readonly DocReference[];
  labels: Record<string, string>;
  language: string;
  copy: DocCopy;
}

const USE_CASE_ICON: Record<string, LucideIcon> = {
  m_and_a: Merge,
  multi_cloud: Cloudy,
  china_global: Globe,
  firewall_consolidation: BrickWall,
  network_modernization: Waypoints,
  site_rollout: Store,
  partner_connectivity: Handshake,
};

export function useCaseIcon(useCase: string): LucideIcon {
  return USE_CASE_ICON[useCase] ?? Network;
}

/** The anchor a question's angle tag jumps to. */
export function angleAnchor(number: number): string {
  return `angle-${number}`;
}

/** Pending or completed, with the deal's date: what makes an M&A angle time-sensitive. */
function DealStatus({ angle, language, copy }: Pick<AngleCardProps, "angle" | "language" | "copy">) {
  const date = readableDate(angle.dealDate, language);

  if (angle.dealStatus === "pending") {
    return (
      <>
        <Pill tone="warning">
          <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.dealPending}
        </Pill>
        {date ? <span className="text-xs font-medium text-warning">{fill(copy.announced, { date })}</span> : null}
      </>
    );
  }
  return (
    <>
      <Pill tone="accent">
        <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {copy.dealCompleted}
      </Pill>
      {date ? <span className="text-xs font-medium text-accent">{date}</span> : null}
    </>
  );
}

/**
 * One reason to call, and the proof that Alkira has done it before. On a wide
 * screen the card is a row of two zones: the company's situation on the left,
 * Alkira's side on the right with the proof at the top, level with the title,
 * so title and proof are read together. Angles differ a lot in how much
 * evidence they have; a row each means no card is stretched to match another.
 * On a narrow screen the zones stack in reading order, proof last.
 */
export function AngleCard({ angle, number, references, labels, language, copy }: AngleCardProps) {
  const headingId = `${angleAnchor(number)}-heading`;
  const UseCaseIcon = useCaseIcon(angle.useCase);
  const isDeal = angle.dealStatus === "pending" || angle.dealStatus === "completed";

  return (
    <m.article
      variants={rise}
      id={angleAnchor(number)}
      aria-labelledby={headingId}
      className="card relative isolate flex scroll-mt-16 flex-col overflow-hidden p-2 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-2"
    >
      {isDeal ? (
        // A warm wash in the corner marks the angle that has a clock on it.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-44"
          style={{ background: "radial-gradient(85% 100% at 0% 0%, rgb(var(--warning-tint-rgb) / 0.95), transparent 72%)" }}
        />
      ) : null}

      <div className="p-4 sm:p-5 lg:p-6">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <span className="num flex h-6 items-center rounded-full bg-ink px-2.5 text-xs font-medium text-white">
            {String(number).padStart(2, "0")}
          </span>
          <Pill tone="neutral" className={isDeal ? "bg-surface/70" : undefined}>
            <UseCaseIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {useCaseLabel(angle.useCase, language)}
          </Pill>
          {isDeal ? <DealStatus angle={angle} language={language} copy={copy} /> : null}
        </p>

        <h3 id={headingId} className="mt-4 text-xl font-semibold leading-snug tracking-heading sm:text-[22px]">
          {angle.title}
        </h3>

        {angle.dealPendingQuote.trim() ? (
          <blockquote className="mt-3 border-l-2 border-warning-fill pl-3 text-sm leading-relaxed text-ink-2">
            &ldquo;{angle.dealPendingQuote.trim()}&rdquo;
          </blockquote>
        ) : null}

        {angle.evidence.length > 0 ? (
          <div className="mt-6">
            <h4 className="micro-label">{labels.evidence ?? "Evidence"}</h4>
            <div className="mt-4">
              <EvidenceList
                evidence={angle.evidence}
                references={references}
                labels={labels}
                language={language}
                sourceLabel={copy.source}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* In the document the answer comes before the proof. On a wide screen the proof is shown first. */}
      <div className="flex flex-col lg:flex-col-reverse lg:justify-end">
        {angle.alkira.trim() ? (
          <div className="border-t border-line p-4 sm:p-5 lg:border-t-0 lg:p-6">
            <h4 className="micro-label text-accent">{labels.alkira_answer ?? "What Alkira does"}</h4>
            <p className="mt-2.5 text-[15px] leading-relaxed text-ink">{angle.alkira}</p>
          </div>
        ) : null}
        <ProofPlate story={angle.story} labels={labels} noStoryNote={copy.noStory} />
      </div>
    </m.article>
  );
}
