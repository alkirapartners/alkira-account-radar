import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BriefActions } from "@/components/brief/brief-actions";
import { BriefBento } from "@/components/brief/brief-bento";
import { BriefHeader } from "@/components/brief/brief-header";
import { BriefBody, BriefNav, BriefTop, hasDocLayout } from "@/components/brief/brief-layout";
import { SectionLinks } from "@/components/brief/doc/section-nav";
import { PinnedBar } from "@/components/brief/pinned-bar";
import type { BriefDetail, BriefDoc } from "@/lib/brief-types";

import { DOC, DOC_BRIEF } from "../doc-fixture";
import { LABELS_ES, RICH_BRIEF, SPARSE_BRIEF } from "../fixtures";
import { renderWithProviders } from "../render";

const NEW_HEADINGS = ["Why this account, why now", "Ask this", "For the engineer", "Who to talk to"];
const OLD_HEADINGS = ["Cloud Platforms", "Signals & Timing", "Conversation Starters"];

function withDoc(change: Partial<BriefDoc>): BriefDetail {
  return { ...DOC_BRIEF, doc: { ...DOC, ...change } };
}

describe("which layout a brief gets", () => {
  it("renders the new layout when the response carries a document", () => {
    renderWithProviders(<BriefBody brief={DOC_BRIEF} />);

    for (const heading of NEW_HEADINGS) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    for (const heading of OLD_HEADINGS) {
      expect(screen.queryByRole("heading", { name: heading })).toBeNull();
    }
  });

  it("renders the old layout when the response has no document", () => {
    renderWithProviders(<BriefBody brief={RICH_BRIEF} />);

    for (const heading of OLD_HEADINGS) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    for (const heading of NEW_HEADINGS) {
      expect(screen.queryByRole("heading", { name: heading })).toBeNull();
    }
  });

  it("renders the old layout when the document cannot be used", () => {
    renderWithProviders(<BriefBody brief={{ ...DOC_BRIEF, doc: { format: 2 } as unknown as BriefDoc }} />);

    expect(screen.getByRole("heading", { name: "Signals & Timing" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Why this account, why now" })).toBeNull();
  });
});

/**
 * The markup a component renders, so two renderings can be compared exactly.
 * The menu library numbers its ids per render; those numbers are evened out.
 */
function markup(ui: React.ReactElement): string {
  const view = renderWithProviders(ui);
  const html = view.container.innerHTML.replace(/radix-[^"\s]+/g, "radix-id");
  view.unmount();
  return html;
}

// Production today: the API sends no document, and every stored brief is legacy markdown.
// This change must be safe to deploy before the backend that sends documents, and after it.
describe("a response with no document", () => {
  const LEGACY: Record<string, BriefDetail> = {
    "as the API sends it today, with no document field": RICH_BRIEF,
    "as the new API sends a legacy brief, with a null document": { ...RICH_BRIEF, format: 1, doc: null },
    "with nothing in it": SPARSE_BRIEF,
    "in Spanish": { ...RICH_BRIEF, language: "es", labels: LABELS_ES },
  };

  for (const [name, brief] of Object.entries(LEGACY)) {
    it(`renders exactly what the page rendered before, ${name}`, () => {
      const actions = <button type="button">Act</button>;

      expect(hasDocLayout(brief)).toBe(false);
      expect(markup(<BriefBody brief={brief} />)).toBe(markup(<BriefBento brief={brief} />));
      expect(markup(<BriefTop brief={brief} reusedFrom="2026-09-30" actions={actions} />)).toBe(
        markup(<BriefHeader brief={brief} reusedFrom="2026-09-30" actions={actions} />),
      );
    });
  }

  it("adds nothing to the pinned bar, and keeps Update as a button there", () => {
    const actions = (updateButtonFrom?: "md" | "xl") => (
      <BriefActions briefId="b" disabled={false} onUpdate={() => {}} onDelete={() => {}} compact updateButtonFrom={updateButtonFrom} />
    );
    const before = markup(<PinnedBar visible company="TestCo" score={4} actions={actions()} />);
    const now = markup(
      <PinnedBar
        visible
        company="TestCo"
        score={4}
        actions={actions(hasDocLayout(RICH_BRIEF) ? "xl" : "md")}
        nav={<BriefNav brief={RICH_BRIEF} />}
      />,
    );

    expect(now).toBe(before);
    expect(now).not.toContain("<nav");
  });
});

describe("the section jump nav", () => {
  const SECTIONS = [
    { id: "why-now", label: "Why now" },
    { id: "engineer", label: "For the engineer" },
  ];

  it("links to each section and marks the one being read", () => {
    renderWithProviders(<SectionLinks sections={SECTIONS} active="engineer" label="On this page" />);

    const nav = screen.getByRole("navigation", { name: "On this page" });
    expect(within(nav).getByRole("link", { name: "Why now" })).toHaveAttribute("href", "#why-now");
    expect(within(nav).getByRole("link", { name: "Why now" })).not.toHaveAttribute("aria-current");
    expect(within(nav).getByRole("link", { name: "For the engineer" })).toHaveAttribute("aria-current", "location");
  });

  it("is left out when there is nowhere to jump between", () => {
    renderWithProviders(<SectionLinks sections={SECTIONS.slice(0, 1)} active={null} label="On this page" />);

    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("lists the document's sections, each of which the page gives an anchor", () => {
    renderWithProviders(
      <>
        <BriefNav brief={DOC_BRIEF} />
        <BriefBody brief={DOC_BRIEF} />
      </>,
    );

    const links = within(screen.getByRole("navigation", { name: "On this page" })).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Why now", "Ask this", "For the engineer", "Who to talk to", "References"]);
    for (const link of links) {
      const target = document.getElementById((link.getAttribute("href") ?? "").slice(1));
      expect(target, link.textContent ?? "").not.toBeNull();
    }
    expect(hasDocLayout(DOC_BRIEF)).toBe(true);
  });

  it("moves Update into the menu sooner when it shares the pinned bar with the nav", () => {
    const actions = (updateButtonFrom: "md" | "xl") => (
      <BriefActions briefId="b" disabled={false} onUpdate={() => {}} onDelete={() => {}} compact updateButtonFrom={updateButtonFrom} />
    );
    const { unmount } = renderWithProviders(actions("md"));
    expect(screen.getByRole("button", { name: "Update brief" })).toHaveClass("md:inline-flex");
    unmount();

    renderWithProviders(actions("xl"));
    expect(screen.getByRole("button", { name: "Update brief" })).toHaveClass("xl:inline-flex");
    expect(screen.getByRole("button", { name: "Update brief" })).not.toHaveClass("md:inline-flex");
  });
});

describe("the document layout", () => {
  it("opens with the score, its verdict and the lead", () => {
    renderWithProviders(<BriefBody brief={DOC_BRIEF} />);

    const verdict = screen.getByRole("region", { name: "Alkira Fit" });
    expect(within(verdict).getByRole("img", { name: "Alkira Fit 5 of 5, strong fit" })).toBeInTheDocument();
    expect(within(verdict).getByText("A pending separation plus an open network posting.")).toBeInTheDocument();
    expect(within(verdict).getByText(/Open with the Lubricants separation\./)).toBeInTheDocument();
    expect(within(verdict).getByText("Azure with ExpressRoute and Virtual WAN, SD-WAN, Palo Alto firewalls")).toBeInTheDocument();
  });

  it("gives each angle its use case, its evidence with a date label, and a link to each source", () => {
    renderWithProviders(<BriefBody brief={DOC_BRIEF} />);

    const deal = screen.getByRole("article", { name: "Lubricants separation needs its own network" });
    expect(within(deal).getByText("M&A")).toBeInTheDocument();
    expect(within(deal).getByText("28 Jul 2026")).toBeInTheDocument();
    expect(within(deal).getByText("Open posting, seen 6 Oct 2026")).toBeInTheDocument();
    expect(within(deal).getByRole("link", { name: /^Source 1: Harbor Fuels press release/ })).toHaveAttribute("href", "#ref-1");

    const china = screen.getByRole("article", { name: "China and global systems joined by a dedicated line" });
    expect(within(china).getByText("Source undated")).toBeInTheDocument();
  });

  it("says a source is undated once: not again as a label when the line says so itself", () => {
    const evidence = [
      { text: "Core ERP runs in the AWS China region (undated AWS case study).", date: "", sources: [3] },
      { text: "Overseas revenue was most of the 2025 total.", date: "", sources: [3] },
    ];
    renderWithProviders(<BriefBody brief={withDoc({ angles: [{ ...DOC.angles[1], evidence }] })} />);

    const china = screen.getByRole("article", { name: "China and global systems joined by a dedicated line" });
    expect(within(china).getAllByText("Source undated")).toHaveLength(1);
    // Both lines still cite their source.
    expect(within(china).getAllByRole("link", { name: /^Source 3/ })).toHaveLength(2);
  });

  it("marks a pending deal as time-sensitive, in the source's own words", () => {
    renderWithProviders(<BriefBody brief={DOC_BRIEF} />);

    const deal = screen.getByRole("article", { name: "Lubricants separation needs its own network" });
    expect(within(deal).getByText(/Pending deal/)).toBeInTheDocument();
    expect(within(deal).getByText(/announced 28 Jul 2026/)).toBeInTheDocument();
    expect(within(deal).getByText(/intended to be executed over the next 12-18 months/)).toBeInTheDocument();

    const china = screen.getByRole("article", { name: "China and global systems joined by a dedicated line" });
    expect(within(china).queryByText(/Pending deal/)).toBeNull();
  });

  it("names the customer for a story, and shows a knowledge-base figure as a metric with no customer", () => {
    renderWithProviders(<BriefBody brief={DOC_BRIEF} />);

    const deal = screen.getByRole("article", { name: "Lubricants separation needs its own network" });
    expect(within(deal).getByRole("heading", { name: "Customer story" })).toBeInTheDocument();
    expect(within(deal).getByText("Michaels")).toBeInTheDocument();
    expect(within(deal).getByText("1,400").tagName).toBe("STRONG");

    const china = screen.getByRole("article", { name: "China and global systems joined by a dedicated line" });
    expect(within(china).getByRole("heading", { name: "Proof point" })).toBeInTheDocument();
    expect(within(china).queryByRole("heading", { name: "Customer story" })).toBeNull();
    expect(within(china).getByText("80%")).toBeInTheDocument();
    expect(within(china).getByText("Network provisioning speed improvement")).toBeInTheDocument();
  });

  it("gives each angle a card of its own, numbered in the document's order", () => {
    const { unmount } = renderWithProviders(<BriefBody brief={withDoc({ angles: DOC.angles.slice(0, 1) })} />);
    expect(screen.getAllByRole("article")).toHaveLength(1);
    unmount();

    renderWithProviders(<BriefBody brief={withDoc({ angles: [...DOC.angles, { ...DOC.angles[1], title: "A third reason" }] })} />);
    const cards = screen.getAllByRole("article");
    expect(cards.map((card) => card.id)).toEqual(["angle-1", "angle-2", "angle-3"]);
    expect(within(cards[2]).getByText("03")).toBeInTheDocument();
  });

  it("keeps each question's listening note and Alkira angle apart, and copies only the question", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    renderWithProviders(<BriefBody brief={DOC_BRIEF} />);

    const first = screen.getAllByRole("listitem").find((item) => within(item).queryByText("Which sites need their own connectivity first?"));
    expect(first).toBeDefined();
    const notes = within(first as HTMLElement);
    expect(notes.getByText("Listen for").tagName).toBe("DT");
    expect(notes.getByText("Shared services and a target date.").tagName).toBe("DD");
    expect(notes.getByText("Alkira angle").tagName).toBe("DT");
    expect(notes.getByText("Each side runs as a separate segment until cutover.").tagName).toBe("DD");

    await userEvent.click(screen.getByRole("button", { name: "Copy question 1" }));
    expect(writeText).toHaveBeenCalledWith("Which sites need their own connectivity first?");
  });

  it("shows every snapshot line, with one that was not found muted and not hidden", () => {
    renderWithProviders(<BriefBody brief={DOC_BRIEF} />);

    const sheet = screen.getByRole("region", { name: "For the engineer" });
    for (const term of ["Clouds", "Cloud connectivity", "WAN", "Firewalls", "Data centers", "Plant networks"]) {
      expect(within(sheet).getByText(term).tagName).toBe("DT");
    }
    expect(within(sheet).getAllByText("Not found in public sources.")).toHaveLength(2);
    expect(within(sheet).getByText("ExpressRoute")).toHaveAttribute("data-term");
  });

  it("lists who to talk to, what could not be confirmed and what would raise the score", () => {
    renderWithProviders(<BriefBody brief={DOC_BRIEF} />);

    const people = screen.getByRole("region", { name: "Who to talk to" });
    expect(within(people).getByText("Dana Reyes")).toBeInTheDocument();
    expect(within(people).getByText("Network engineering lead, Dallas")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "What we couldn't confirm" })).toBeInTheDocument();
    expect(screen.getByText("Whether SD-WAN is deployed.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What would raise the score" })).toBeInTheDocument();
    expect(screen.getByText("A named IT leader confirming the separation scope.")).toBeInTheDocument();
  });

  it("numbers the references, each with its source type and date label, linked in a new tab", () => {
    renderWithProviders(<BriefBody brief={DOC_BRIEF} />);

    const references = screen.getByRole("region", { name: "References" });
    const rows = within(references).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveAttribute("id", "ref-2");

    const posting = within(rows[1]).getByRole("link");
    expect(posting).toHaveAttribute("href", "https://careers.harborfuels.example/job/network-engineer");
    expect(posting).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(rows[1]).getByText("Harbor Fuels careers: Network Engineer")).toBeInTheDocument();
    expect(within(rows[1]).getByText("First-hand")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Open posting, seen 6 Oct 2026")).toBeInTheDocument();

    expect(within(rows[2]).getByText("Second-hand")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Source undated")).toBeInTheDocument();
  });

  it("gives a number used by two references to the first, so a chip has one place to land", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const references = [DOC.references[0], { ...DOC.references[1], n: 1 }, DOC.references[2]];
    renderWithProviders(<BriefBody brief={withDoc({ references })} />);

    const rows = within(screen.getByRole("region", { name: "References" })).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.id)).toEqual(["ref-1", "", "ref-3"]);
    expect(document.querySelectorAll("#ref-1")).toHaveLength(1);
    // Both rows are drawn, each with its own link, and React was given distinct keys.
    expect(within(rows[1]).getByRole("link")).toHaveAttribute("href", "https://careers.harborfuels.example/job/network-engineer");
    expect(errors.mock.calls.flat().join(" ")).not.toMatch(/same key/);
    errors.mockRestore();
  });

  it("lets free text break anywhere, so a long unbroken string cannot widen the page", () => {
    const token = "x".repeat(200);
    const angles = [{ ...DOC.angles[0], title: token, evidence: [{ text: token, date: "", sources: [] }] }];
    const { container } = renderWithProviders(<BriefBody brief={withDoc({ angles })} />);

    // The rule is inherited from the layout's root, so it reaches every piece of text in it.
    expect(container.firstElementChild).toHaveClass("[overflow-wrap:anywhere]");
    expect(container.firstElementChild).toContainElement(screen.getByRole("heading", { name: token }));
    expect(screen.getAllByText(token).every((node) => !node.className.includes("whitespace-nowrap"))).toBe(true);
  });

  it("never links a reference whose address is not a web address", () => {
    const references = [{ ...DOC.references[0], url: "javascript:alert(1)" }];
    renderWithProviders(<BriefBody brief={withDoc({ references })} />);

    const list = screen.getByRole("region", { name: "References" });
    expect(within(list).queryByRole("link")).toBeNull();
    expect(within(list).getByText("Harbor Fuels press release: separation of Lubricants")).toBeInTheDocument();
  });

  it("speaks the brief's language, in the labels the API sends and in its own few words", () => {
    const labels = {
      ...DOC_BRIEF.labels,
      why_now: "Por qué esta cuenta, por qué ahora",
      undated: "fuente sin fecha",
      open_posting_seen: "vacante abierta, vista el {date}",
    };
    renderWithProviders(<BriefBody brief={{ ...DOC_BRIEF, language: "es", labels }} />);

    expect(screen.getByRole("heading", { name: "Por qué esta cuenta, por qué ahora" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pregunte esto" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Para el ingeniero" })).toBeInTheDocument();
    const deal = screen.getByRole("article", { name: "Lubricants separation needs its own network" });
    expect(within(deal).getByText("Fusiones y adquisiciones")).toBeInTheDocument();
    expect(within(deal).getByText("Vacante abierta, vista el 6 oct 2026")).toBeInTheDocument();
    expect(within(deal).getByText(/anunciada el 28 jul 2026/)).toBeInTheDocument();
  });

  it("still renders a document from before the deal fields existed", () => {
    const early = DOC.angles.map(({ dealDate: _date, dealStatus: _status, dealPendingQuote: _quote, ...angle }) => angle);
    renderWithProviders(<BriefBody brief={withDoc({ angles: early as unknown as BriefDoc["angles"] })} />);

    const deal = screen.getByRole("article", { name: "Lubricants separation needs its own network" });
    expect(within(deal).getByText("M&A")).toBeInTheDocument();
    expect(within(deal).queryByText(/Pending deal/)).toBeNull();
  });

  it("closes up around the sections a document leaves empty", () => {
    renderWithProviders(
      <BriefBody brief={withDoc({ angles: [], people: [], questions: [], unconfirmed: [], raiseScore: [], references: [] })} />,
    );

    expect(screen.getByRole("region", { name: "Alkira Fit" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "For the engineer" })).toBeInTheDocument();
    for (const heading of ["Why this account, why now", "Ask this", "Who to talk to", "What we couldn't confirm", "References"]) {
      expect(screen.queryByRole("heading", { name: heading })).toBeNull();
    }
  });
});

describe("the brief's header", () => {
  it("says which company the document resolved, and keeps ownership out of the pills", () => {
    renderWithProviders(<BriefTop brief={DOC_BRIEF} reusedFrom={null} actions={null} />);

    expect(screen.getByRole("heading", { level: 1, name: "Harbor Fuels" })).toBeInTheDocument();
    expect(screen.getByText("Harbor Fuels Corporation")).toBeInTheDocument();
    expect(screen.getByText("Public (NYSE: HRBR)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /harborfuels\.example/ })).toHaveAttribute("href", "https://www.harborfuels.example");
    expect(screen.getByText(/not Harbor Fuel Oil of Maine/)).toBeInTheDocument();

    const pills = screen.getByRole("list");
    expect(within(pills).getByText("Dallas, Texas")).toBeInTheDocument();
    expect(within(pills).queryByText("Public (NYSE: HRBR)")).toBeNull();
  });

  it("is unchanged for a brief with no document", () => {
    renderWithProviders(<BriefTop brief={RICH_BRIEF} reusedFrom={null} actions={null} />);

    expect(screen.getByRole("heading", { level: 1, name: "TestCo Holdings" })).toBeInTheDocument();
    expect(screen.getByText("Austin, TX")).toBeInTheDocument();
    expect(screen.queryByText("Which company")).toBeNull();
  });
});
