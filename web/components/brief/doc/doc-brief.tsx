"use client";

import { m } from "motion/react";

import { readableDate } from "@/lib/brief-doc";
import { docCopy, fill, type DocCopy } from "@/lib/brief-doc-copy";
import { SECTION_ID } from "@/lib/brief-sections";
import type { BriefDetail, BriefDoc } from "@/lib/brief-types";
import { rise, stagger } from "@/lib/motion";

import { AngleCard } from "./angle-card";
import { DocReferences } from "./doc-references";
import { EngineerSheet } from "./engineer-sheet";
import { HonestyBlock } from "./honesty-block";
import { PeopleCard } from "./people-card";
import { QuestionsCard } from "./questions-card";
import { VerdictPanel } from "./verdict-panel";

interface DocBriefProps {
  brief: BriefDetail;
  doc: BriefDoc;
}

interface SectionProps {
  doc: BriefDoc;
  labels: Record<string, string>;
  language: string;
  copy: DocCopy;
}

/** The hero: every reason to call, each a full-width card, under the page's one large section heading. */
function WhyNow({ doc, labels, language, copy }: SectionProps) {
  return (
    <section id={SECTION_ID.whyNow} aria-labelledby="why-now-heading" className="mt-12 scroll-mt-16 sm:mt-16">
      <m.h2
        variants={rise}
        id="why-now-heading"
        className="text-[clamp(1.625rem,1.2rem+1.6vw,2.25rem)] font-semibold leading-[1.1] tracking-display"
      >
        {labels.why_now ?? "Why this account, why now"}
      </m.h2>
      <div className="mt-6 grid gap-4">
        {doc.angles.map((angle, index) => (
          <AngleCard
            key={`${index}:${angle.title}`}
            angle={angle}
            number={index + 1}
            references={doc.references}
            labels={labels}
            language={language}
            copy={copy}
          />
        ))}
      </div>
    </section>
  );
}

/** What to ask, beside what an engineer wants to know. The sheet takes the whole row when there are no questions. */
function AskAndSnapshot({ doc, labels, language, copy }: SectionProps) {
  const hasQuestions = doc.questions.length > 0;

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-12">
      {hasQuestions ? (
        <QuestionsCard
          questions={doc.questions}
          angles={doc.angles}
          labels={labels}
          language={language}
          copy={copy}
          className="lg:col-span-7"
        />
      ) : null}
      <EngineerSheet
        snapshot={doc.snapshot}
        references={doc.references}
        labels={labels}
        copy={copy}
        wide={!hasQuestions}
        className={hasQuestions ? "lg:col-span-5" : "lg:col-span-12"}
      />
    </div>
  );
}

/** How much research stands behind the brief and when it was written, then the confidentiality mark. */
function Colophon({ doc, labels, language, copy }: SectionProps) {
  const generated = readableDate(doc.generated, language);
  const { research } = doc;

  return (
    <m.footer variants={rise} className="mt-8 flex flex-col items-center gap-3 text-center">
      {research ? (
        <p className="text-[13px] leading-relaxed text-ink-2">
          {fill(copy.research, { searches: research.searches, pages: research.pages, seconds: research.seconds })}
          {generated ? `. ${fill(copy.generated, { date: generated })}.` : "."}
        </p>
      ) : null}
      {labels.confidential ? <p className="micro-label">{labels.confidential}</p> : null}
    </m.footer>
  );
}

/**
 * A brief document, top to bottom in the order it is read: the verdict a rep
 * needs in thirty seconds, the angles with their proof, what to ask beside
 * what an engineer wants to know, who to call, what is still unknown, and the
 * sources. A section with nothing in it is left out.
 */
export function DocBrief({ brief, doc }: DocBriefProps) {
  const { labels, language } = brief;
  const section: SectionProps = { doc, labels, language, copy: docCopy(language) };
  const hasHonesty = doc.unconfirmed.length > 0 || doc.raiseScore.length > 0;

  return (
    // Everything here is free text written from other people's pages. `overflow-wrap` is inherited,
    // so set once on the root it lets any of it (a long address, a token with no spaces) break
    // inside its own box instead of pushing the page wider.
    <m.div variants={stagger(0.04, 0.05)} className="[overflow-wrap:anywhere]">
      <VerdictPanel doc={doc} labels={labels} />

      {doc.angles.length > 0 ? <WhyNow {...section} /> : null}

      <AskAndSnapshot {...section} />

      {doc.people.length > 0 ? (
        <div className="mt-4">
          <PeopleCard people={doc.people} references={doc.references} labels={labels} copy={section.copy} />
        </div>
      ) : null}

      {hasHonesty ? (
        <div className="mt-4">
          <HonestyBlock unconfirmed={doc.unconfirmed} raiseScore={doc.raiseScore} score={doc.fit.score} labels={labels} />
        </div>
      ) : null}

      {doc.references.length > 0 ? (
        <div className="mt-12 sm:mt-14">
          <DocReferences references={doc.references} labels={labels} language={language} copy={section.copy} />
        </div>
      ) : null}

      <Colophon {...section} />
    </m.div>
  );
}
