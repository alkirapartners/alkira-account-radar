import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BriefBento } from "@/components/brief/brief-bento";
import { BriefHeader, formatReusedDate } from "@/components/brief/brief-header";

import { LABELS_ES, RICH_BRIEF, SPARSE_BRIEF } from "../fixtures";
import { renderWithProviders } from "../render";

describe("BriefBento", () => {
  it("lays out every section of a full brief", () => {
    renderWithProviders(<BriefBento brief={RICH_BRIEF} />);

    expect(screen.getByRole("img", { name: "Alkira Fit 4 of 5, strong fit" })).toBeInTheDocument();
    expect(screen.getByText("Strong fit")).toBeInTheDocument();
    expect(screen.getByText("TestCo runs production across Azure and AWS.")).toBeInTheDocument();
    for (const heading of ["Cloud Platforms", "On-Prem / Hybrid", "Deployment Model", "Resulting Complexity", "Signals & Timing"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText("Two clouds plus acquired networks.")).toBeInTheDocument();
    for (const heading of ["Multi-cloud connectivity", "Zero trust segmentation", "M&A integration"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText("96% faster.")).toBeInTheDocument();
  });

  it("renders bold inside a signal instead of showing the asterisks", () => {
    renderWithProviders(<BriefBento brief={RICH_BRIEF} />);

    expect(screen.getByText("Q1 2026").tagName).toBe("STRONG");
    expect(document.body.textContent).not.toContain("**");
  });

  it("makes each conversation starter copyable, without its number or quotes", () => {
    renderWithProviders(<BriefBento brief={RICH_BRIEF} />);

    expect(screen.getByText("How is the Azure-AWS connectivity going?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy question 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy question 2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy question 3" })).toBeNull();
  });

  it("links each reference to its source in a new tab", () => {
    renderWithProviders(<BriefBento brief={RICH_BRIEF} />);

    const link = screen.getByRole("link", { name: /TestCo 10-K/ });
    expect(link).toHaveAttribute("href", "https://example.com/10k");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(link).getByText("example.com")).toBeInTheDocument();
  });

  it("renders a sparse brief without empty shells", () => {
    renderWithProviders(<BriefBento brief={SPARSE_BRIEF} />);

    // The score tile stays, because "not scored" is worth saying.
    expect(screen.getByRole("img", { name: "Alkira Fit: not scored" })).toBeInTheDocument();
    expect(screen.getByText("Not scored")).toBeInTheDocument();
    expect(screen.getByText(/didn.t come back with a fit score/i)).toBeInTheDocument();
    // Everything with nothing in it is left out.
    for (const heading of ["Cloud Platforms", "Signals & Timing", "Conversation Starters", "References"]) {
      expect(screen.queryByRole("heading", { name: heading })).toBeNull();
    }
    expect(screen.queryByText("Entry")).toBeNull();
    expect(screen.queryByRole("button", { name: /copy question/i })).toBeNull();
  });

  it("uses the brief's own language for tile labels", () => {
    renderWithProviders(<BriefBento brief={{ ...RICH_BRIEF, language: "es", labels: LABELS_ES }} />);

    expect(screen.getByRole("heading", { name: "Ajuste Alkira" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Señales y Oportunidad" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Temas de Conversación" })).toBeInTheDocument();
    expect(screen.getAllByText("Evidencia")).toHaveLength(3);
  });

  it("falls back to English labels when the API sends none", () => {
    renderWithProviders(<BriefBento brief={{ ...RICH_BRIEF, labels: {} }} />);

    expect(screen.getByRole("heading", { name: "Alkira Fit" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Conversation Starters" })).toBeInTheDocument();
  });

  it("shows only the entry points it was given", () => {
    renderWithProviders(<BriefBento brief={{ ...RICH_BRIEF, entryPoints: RICH_BRIEF.entryPoints.slice(0, 1) }} />);

    expect(screen.getByRole("heading", { name: "Multi-cloud connectivity" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Zero trust segmentation" })).toBeNull();
    expect(screen.getAllByText("Entry")).toHaveLength(1);
  });
});

describe("BriefHeader", () => {
  it("shows the company, its stats as labelled pills, and a way back", () => {
    renderWithProviders(<BriefHeader brief={RICH_BRIEF} reusedFrom={null} actions={<button type="button">Act</button>} />);

    expect(screen.getByRole("heading", { level: 1, name: "TestCo Holdings" })).toBeInTheDocument();
    expect(screen.getByText("Austin, TX")).toBeInTheDocument();
    expect(screen.getByText("$5B")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /your briefs/i })).toHaveAttribute("href", "/");
    expect(screen.queryByText(/reused research/i)).toBeNull();
  });

  it("flags reused research and points to Update", () => {
    renderWithProviders(<BriefHeader brief={RICH_BRIEF} reusedFrom="2026-09-30" actions={null} />);

    expect(screen.getByText(/Reused research from Sep 30/)).toBeInTheDocument();
  });

  it("ignores a reused date it cannot read", () => {
    expect(formatReusedDate("not-a-date")).toBe("");
    expect(formatReusedDate("2026-09-30")).toBe("Sep 30");
  });
});
