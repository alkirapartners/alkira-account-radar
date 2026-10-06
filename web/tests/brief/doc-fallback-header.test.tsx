import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BriefNav, BriefTop } from "@/components/brief/brief-layout";

import { DOC_BRIEF } from "../doc-fixture";
import { renderWithProviders } from "../render";

// The document-driven parts outside the body: the identity line in the header and the jump nav.
vi.mock("@/components/brief/doc/identity-line", () => ({
  IdentityLine: () => {
    throw new Error("the identity line broke");
  },
}));
vi.mock("@/components/brief/doc/section-nav", () => ({
  SectionNav: () => {
    throw new Error("the jump nav broke");
  },
}));

describe("when a document-driven part of the header fails to render", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the legacy header, with its actions", () => {
    const onLayoutError = vi.fn();
    renderWithProviders(
      <BriefTop brief={DOC_BRIEF} reusedFrom={null} actions={<a href="/pdf">Download PDF</a>} onLayoutError={onLayoutError} />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Harbor Fuels" })).toBeInTheDocument();
    expect(screen.getByText("Ownership")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download PDF" })).toBeInTheDocument();
    expect(onLayoutError).toHaveBeenCalled();
  });

  it("leaves the pinned bar without a nav instead of taking the page down", () => {
    const onLayoutError = vi.fn();
    renderWithProviders(
      <>
        <p>Pinned bar</p>
        <BriefNav brief={DOC_BRIEF} onLayoutError={onLayoutError} />
      </>,
    );

    expect(screen.getByText("Pinned bar")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(onLayoutError).toHaveBeenCalled();
  });
});
