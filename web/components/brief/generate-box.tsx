"use client";

import { ArrowRight, CircleAlert, Sparkles } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { SegmentedControl, type SegmentOption } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import type { BriefSummary, Language } from "@/lib/brief-types";
import { DUR, EASE_IN, EASE_OUT, SPRING_LAYOUT } from "@/lib/motion";
import { MAX_COMPANY_CHARS, cleanCompany } from "@/lib/prefill";

import { AmbientPanel } from "./ambient-panel";
import { HeroAside } from "./hero-aside";
import { ProgressView } from "./progress-view";
import type { GenerationState } from "./use-generation";

interface GenerateBoxProps {
  state: GenerationState;
  /** A company name to place in the field (from a ?company= link). */
  prefill: string;
  /** The most recent brief: undefined while loading, null when there are none. */
  latest: BriefSummary | null | undefined;
  onGenerate: (company: string, language: Language) => void;
}

const LANGUAGES: SegmentOption<Language>[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

const EMPTY_ERROR = "Enter a company name.";
const TOO_LONG_ERROR = `Company names are limited to ${MAX_COMPANY_CHARS} characters.`;

const swap = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT, delay: 0.05 } },
  exit: { opacity: 0, y: -8, transition: { duration: DUR.fast, ease: EASE_IN } },
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function GenerateBox({ state, prefill, latest, onGenerate }: GenerateBoxProps) {
  const [company, setCompany] = useState(prefill);
  const [language, setLanguage] = useState<Language>("en");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prefill) setCompany(prefill);
  }, [prefill]);

  // "/" jumps to the company field from anywhere on the page.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      input.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const name = cleanCompany(company);
    if (!name) {
      setFieldError(company.trim().length > MAX_COMPANY_CHARS ? TOO_LONG_ERROR : EMPTY_ERROR);
      input.current?.focus();
      return;
    }
    setFieldError(null);
    onGenerate(name, language);
  }

  return (
    <m.div layout transition={SPRING_LAYOUT} style={{ borderRadius: 28 }}>
      <AmbientPanel>
        <m.div layout="position" transition={SPRING_LAYOUT} className="p-6 sm:p-10 lg:p-12">
          <AnimatePresence mode="wait" initial={false}>
            {state.status === "running" || state.status === "done" ? (
              <m.div key="progress" {...swap}>
                <ProgressView
                  company={state.company}
                  phase={state.status === "done" ? "done" : state.phase}
                  startedAt={state.startedAt}
                />
              </m.div>
            ) : (
              <m.div key="form" {...swap} className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-14">
                <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-2.5 pr-3.5 text-[13px] font-medium text-on-ambient">
                  <Sparkles className="h-3.5 w-3.5 text-accent-soft" aria-hidden="true" />
                  Brief Generator
                </p>
                <h1 className="mt-5 max-w-[18ch] text-[clamp(2rem,1.1rem+3.6vw,3.5rem)] font-semibold leading-[1.04] tracking-display">
                  Know the account before the first call.
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-on-ambient-2 sm:text-[17px]">
                  Enter a company and get a scored opportunity brief: where Alkira fits, the proof to bring, and the
                  questions to ask.
                </p>

                {state.status === "error" ? (
                  <p
                    role="alert"
                    className="mt-7 flex items-start gap-2.5 rounded-inner border border-[#FDA4AF]/30 bg-[#FDA4AF]/10 px-4 py-3 text-sm text-[#FECDD3]"
                  >
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {state.message}
                  </p>
                ) : null}

                <form onSubmit={submit} noValidate className="mt-8 max-w-2xl">
                  <TextField
                    ref={input}
                    tone="ambient"
                    label="Company"
                    name="company"
                    placeholder="Company name"
                    autoComplete="organization"
                    autoCapitalize="words"
                    enterKeyHint="go"
                    spellCheck={false}
                    value={company}
                    error={fieldError}
                    onChange={(event) => {
                      setCompany(event.target.value);
                      if (fieldError) setFieldError(null);
                    }}
                    trailing={
                      <kbd
                        aria-hidden="true"
                        className="hidden h-6 min-w-6 items-center justify-center rounded-md border border-white/15 px-1.5 font-mono text-xs text-on-ambient-2 sm:inline-flex"
                      >
                        /
                      </kbd>
                    }
                  />
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <SegmentedControl
                      label="Brief language"
                      tone="ambient"
                      options={LANGUAGES}
                      value={language}
                      onChange={setLanguage}
                      className="self-start"
                    />
                    <Button type="submit" size="lg" className="w-full sm:w-auto">
                      Generate brief
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <p className="mt-5 text-sm text-on-ambient-2">
                    Takes about a minute. Research from the last 7 days is reused.
                  </p>
                </form>
                </div>
                <div className="hidden lg:block">
                  <HeroAside latest={latest} />
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      </AmbientPanel>
    </m.div>
  );
}
