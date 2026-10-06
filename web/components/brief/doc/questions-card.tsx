"use client";

import { CornerDownRight, Ear } from "lucide-react";

import { CopyButton } from "@/components/ui/copy-button";
import { fill, nameOfUseCase, type DocCopy } from "@/lib/brief-doc-copy";
import type { DocAngle, DocQuestion } from "@/lib/brief-types";
import { cn } from "@/lib/cn";

import { Tile } from "../tiles/tile";
import { angleAnchor, iconOfUseCase } from "./angle-card";

interface QuestionsCardProps {
  questions: readonly DocQuestion[];
  angles: readonly DocAngle[];
  labels: Record<string, string>;
  language: string;
  copy: DocCopy;
  className?: string;
}

const HEADING_ID = "ask-heading";
const NOTE_ROW = "grid gap-1.5 px-4 py-3.5 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-start sm:gap-4";
// The label's box is as tall as one line of the text beside it, so the two sit level.
const NOTE_LABEL = "micro-label flex items-center gap-1.5 sm:h-[1.625rem]";

/** Which angle a question is about: its use case, linking up to the angle's card. */
function AngleTag({ angle, number, language, copy }: { angle: DocAngle; number: number; language: string; copy: DocCopy }) {
  const Icon = iconOfUseCase(angle.useCase);

  return (
    <a
      href={`#${angleAnchor(number)}`}
      aria-label={`${fill(copy.angle, { n: number })}: ${angle.title}`}
      title={angle.title}
      className={cn(
        "relative inline-flex h-6 items-center gap-1.5 rounded-full bg-sunken px-2.5 text-xs font-medium text-ink-2",
        "transition-[background-color,color,transform] duration-fast ease-out",
        "after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-['']",
        "hover:bg-accent/10 hover:text-accent active:scale-95",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {nameOfUseCase(angle.useCase, language)}
    </a>
  );
}

interface QuestionProps {
  item: DocQuestion;
  number: number;
  /** The angle the question is about, when it names one that exists. */
  angle: DocAngle | undefined;
  labels: Record<string, string>;
  language: string;
  copy: DocCopy;
}

/** One question, with what to listen for and Alkira's angle as two tinted, labelled rows. */
function Question({ item, number, angle, labels, language, copy }: QuestionProps) {
  return (
    <li className="py-6 last:pb-0">
      <div className="flex items-start gap-3.5 sm:gap-4">
        <span className="num pt-[3px] text-sm font-medium text-accent" aria-hidden="true">
          {String(number).padStart(2, "0")}
        </span>
        <p className="min-w-0 flex-1 text-[17px] font-medium leading-snug text-ink sm:text-lg sm:leading-snug">{item.question}</p>
        <CopyButton text={item.question} label={`Copy question ${number}`} className="-mr-2 -mt-1.5" />
      </div>

      <div className="sm:pl-9">
        {angle ? (
          <p className="mt-3">
            <AngleTag angle={angle} number={item.angle} language={language} copy={copy} />
          </p>
        ) : null}

        <dl className="mt-4 overflow-hidden rounded-inner">
          <div className={cn(NOTE_ROW, "bg-sunken")}>
            <dt className={NOTE_LABEL}>
              <Ear className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {labels.listen_for ?? "Listen for"}
            </dt>
            <dd className="text-[15px] leading-relaxed text-ink">{item.listenFor}</dd>
          </div>
          <div className={cn(NOTE_ROW, "mt-px bg-accent/[0.07]")}>
            <dt className={cn(NOTE_LABEL, "text-accent")}>
              <CornerDownRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {labels.alkira_angle ?? "Alkira angle"}
            </dt>
            <dd className="text-[15px] leading-relaxed text-ink">{item.alkiraAngle}</dd>
          </div>
        </dl>
      </div>
    </li>
  );
}

/**
 * The questions to ask, built to be read at a glance mid-meeting: the question
 * large, then what to listen for and Alkira's angle as two labelled rows whose
 * labels line up down the card.
 */
export function QuestionsCard({ questions, angles, labels, language, copy, className }: QuestionsCardProps) {
  return (
    <Tile labelledBy={HEADING_ID} className={className}>
      <h2 id={HEADING_ID} className="text-xl font-semibold tracking-heading">
        {copy.askThis}
      </h2>

      <ol className="mt-5 divide-y divide-line border-t border-line">
        {questions.map((item, index) => (
          <Question
            key={index}
            item={item}
            number={index + 1}
            angle={item.angle > 0 ? angles[item.angle - 1] : undefined}
            labels={labels}
            language={language}
            copy={copy}
          />
        ))}
      </ol>
    </Tile>
  );
}
