import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BriefActions } from "@/components/brief/brief-actions";
import { BriefBody, BriefNav, BriefTop, hasDocLayout, useLayoutFailure } from "@/components/brief/brief-layout";
import type { BriefDetail } from "@/lib/brief-types";

import { DOC_BRIEF } from "../doc-fixture";
import { renderWithProviders } from "../render";

// A part of the document layout that throws while rendering, standing in for any bug in it.
vi.mock("@/components/brief/doc/verdict-panel", () => ({
  VerdictPanel: () => {
    throw new Error("the verdict panel broke");
  },
}));

const NEW_HEADINGS = ["Why this account, why now", "Ask this", "For the engineer"];
const OLD_HEADINGS = ["Alkira Fit", "Cloud Platforms", "Signals & Timing", "Conversation Starters", "References"];

/** The brief page's own arrangement: header, pinned-bar nav and body sharing one failure flag. */
function Page({ brief, onDelete }: { brief: BriefDetail; onDelete: () => void }) {
  const [hasFailed, onLayoutError] = useLayoutFailure(brief.id);
  const actions = <BriefActions briefId={brief.id} disabled={false} onUpdate={() => {}} onDelete={onDelete} />;

  return (
    <>
      <p>{hasDocLayout(brief) && !hasFailed ? "document layout" : "legacy layout"}</p>
      <BriefTop brief={brief} reusedFrom={null} actions={actions} forceLegacy={hasFailed} onLayoutError={onLayoutError} />
      <BriefNav brief={brief} forceLegacy={hasFailed} onLayoutError={onLayoutError} />
      <BriefBody brief={brief} forceLegacy={hasFailed} onLayoutError={onLayoutError} />
    </>
  );
}

describe("when the document layout fails to render", () => {
  // React reports the caught error to the console; that report is expected here.
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the brief in the existing layout, from the legacy fields, and not a blank page", () => {
    const onLayoutError = vi.fn();
    renderWithProviders(<BriefBody brief={DOC_BRIEF} onLayoutError={onLayoutError} />);

    for (const heading of OLD_HEADINGS) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    for (const heading of NEW_HEADINGS) {
      expect(screen.queryByRole("heading", { name: heading })).toBeNull();
    }
    expect(screen.getByText("Michaels: About 1,400 stores connected to Google Cloud in three weeks.")).toBeInTheDocument();
    expect(onLayoutError).toHaveBeenCalled();
  });

  it("takes the header and the jump nav back to their legacy form too, so the page is one layout", () => {
    renderWithProviders(<Page brief={DOC_BRIEF} onDelete={() => {}} />);

    expect(screen.getByText("legacy layout")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Harbor Fuels" })).toBeInTheDocument();
    // The legacy header: ownership is a pill again, and the resolved-identity line is gone.
    expect(screen.getByText("Ownership")).toBeInTheDocument();
    expect(screen.queryByText("Harbor Fuels Corporation")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "On this page" })).toBeNull();
  });

  it("keeps the PDF and delete actions usable", async () => {
    const onDelete = vi.fn();
    renderWithProviders(<Page brief={DOC_BRIEF} onDelete={onDelete} />);

    expect(screen.getByRole("link", { name: /Download PDF/ })).toHaveAttribute("href", "/api/brief/briefs/b-doc/pdf");
    await userEvent.click(screen.getByRole("button", { name: "More actions" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Delete brief/ }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("gives the next brief a fresh start", () => {
    const other: BriefDetail = { ...DOC_BRIEF, id: "b-other", doc: null };
    const { rerender } = renderWithProviders(<Page brief={DOC_BRIEF} onDelete={() => {}} />);
    expect(screen.getByText("legacy layout")).toBeInTheDocument();

    rerender(<Page brief={other} onDelete={() => {}} />);
    expect(screen.getByRole("heading", { name: "Signals & Timing" })).toBeInTheDocument();
  });
});
