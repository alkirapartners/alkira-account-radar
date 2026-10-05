"use client";

import { m } from "motion/react";

import { CopyButton } from "@/components/ui/copy-button";
import { Markdown } from "@/components/ui/markdown";
import { parseStarters } from "@/lib/brief-content";
import { rise } from "@/lib/motion";

import { AmbientPanel } from "../ambient-panel";

interface StartersTileProps {
  label: string;
  startersMd: string;
}

/** The questions to ask, on the dark surface, each one copyable. */
export function StartersTile({ label, startersMd }: StartersTileProps) {
  const { notes, questions } = parseStarters(startersMd);

  return (
    <m.section variants={rise} className="col-span-full">
      <AmbientPanel quiet className="rounded-card">
        <div className="p-6 sm:p-9">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.09em] text-accent-soft">{label}</h2>

          {notes.length > 0 ? (
            <div className="mt-5 space-y-1.5 text-[15px] leading-relaxed text-on-ambient-2 [&_strong]:text-on-ambient">
              {notes.map((note, index) => (
                <Markdown key={index}>{note}</Markdown>
              ))}
            </div>
          ) : null}

          {questions.length > 0 ? (
            <ol className="mt-6 divide-y divide-white/10 border-t border-white/10">
              {questions.map((question, index) => (
                <li key={index} className="flex items-start gap-4 py-5 last:pb-0 sm:gap-6">
                  <span className="num pt-1 text-sm text-accent-soft" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="min-w-0 flex-1 text-[17px] leading-relaxed text-on-ambient sm:text-xl sm:leading-relaxed">
                    {question}
                  </p>
                  <CopyButton text={question} label={`Copy question ${index + 1}`} tone="ambient" className="-mr-2" />
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </AmbientPanel>
    </m.section>
  );
}
