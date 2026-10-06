import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GenerateBox } from "@/components/brief/generate-box";
import { HeroAside } from "@/components/brief/hero-aside";
import { Library } from "@/components/brief/library";
import { STEPS, StepTracker } from "@/components/brief/step-tracker";
import type { BriefPhase } from "@/lib/brief-types";

import { renderWithProviders } from "../render";

// What the generator does, in the order it does it: it works out exactly which company the name means,
// then a model searches and reads sources and follows leads, then checks the evidence and scores the fit,
// then writes the brief. The words on screen describe that, and put no counts in it that would go stale.
const PHASE_DETAIL: Record<Exclude<BriefPhase, "done">, string> = {
  init: "Working out exactly which company this is",
  research: "Searching and reading sources, following leads such as careers pages, filings and press releases",
  analyze: "Checking the evidence and scoring the fit",
  compose: "Writing the brief from those sources",
};

/** What the screen used to say about the old method: a fixed number of searches and pages, and a minute. */
const OLD_METHOD = /web search|eight|top 5|best five|five pages|8 search|about a minute/i;

describe("the generation screen's description of the method", () => {
  it("keeps the same four phases, in order, and the done state", () => {
    expect(STEPS.map((step) => step.phase)).toEqual(["init", "research", "analyze", "compose"]);
    expect(STEPS.map((step) => step.label)).toEqual(["Starting", "Researching", "Analyzing", "Composing"]);
  });

  for (const [phase, detail] of Object.entries(PHASE_DETAIL)) {
    it(`says what the ${phase} phase does`, () => {
      renderWithProviders(<StepTracker phase={phase as BriefPhase} />);

      expect(screen.getByRole("status")).toHaveTextContent(detail);
    });
  }

  it("says the brief is opening once it is done", () => {
    renderWithProviders(<StepTracker phase="done" />);

    expect(screen.getByRole("status")).toHaveTextContent("Opening your brief");
  });

  it("puts no count in any phase, so none can go stale", () => {
    for (const step of STEPS) {
      expect(step.detail, step.phase).not.toMatch(/\d/);
      expect(step.detail, step.phase).not.toMatch(OLD_METHOD);
    }
  });

  it("promises about two minutes on the form, and the reuse window the server keeps", () => {
    renderWithProviders(<GenerateBox state={{ status: "idle" }} prefill="" latest={null} onGenerate={vi.fn()} />);

    expect(screen.getByText("Takes about two minutes. Research from the last 14 days is reused.")).toBeInTheDocument();
  });

  it("tells a first-time visitor what the research is, without a count", () => {
    renderWithProviders(<HeroAside latest={null} />);

    expect(screen.getByText("Sources searched and read, the evidence checked")).toBeInTheDocument();
    expect(screen.getByText("A fit score, entry points, questions to ask")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(OLD_METHOD);
    expect(document.body.textContent).not.toMatch(/three/i);
  });

  it("tells an empty library what happens when a brief is generated, without a count", () => {
    renderWithProviders(
      <Library briefs={[]} isLoading={false} isError={false} onRetry={vi.fn()} query="" onQueryChange={vi.fn()} sort="newest" onSortChange={vi.fn()} />,
    );

    expect(screen.getByText("It works out exactly which company you mean, then searches and reads sources and checks the evidence.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(OLD_METHOD);
  });
});
