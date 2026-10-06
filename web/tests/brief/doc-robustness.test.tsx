import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BriefBody, BriefNav, BriefTop } from "@/components/brief/brief-layout";
import type { BriefDetail } from "@/lib/brief-types";
import { readDoc } from "@/lib/read-brief-doc";

import { DOC, DOC_BRIEF } from "../doc-fixture";
import { RICH_BRIEF } from "../fixtures";
import { renderWithProviders } from "../render";

// The document comes from another service and is written by a model. One field missing,
// null or of the wrong type must never blank the page: it is read as empty and left out.

/** Loose on purpose: these tests damage the document in ways its type forbids. */
type Damaged = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function damaged(change: (doc: Damaged) => void): BriefDetail {
  const doc = structuredClone(DOC) as unknown as Damaged;
  change(doc);
  return { ...DOC_BRIEF, doc: doc as unknown as BriefDetail["doc"] };
}

function renderPage(brief: BriefDetail) {
  return renderWithProviders(
    <>
      <BriefTop brief={brief} reusedFrom={null} actions={<a href="/pdf">Download PDF</a>} />
      <BriefNav brief={brief} />
      <BriefBody brief={brief} />
    </>,
  );
}

const header = () => screen.getByRole("banner");
const firstAngle = () => screen.getAllByRole("article")[0];
const verdict = () => screen.getByRole("region", { name: "Alkira Fit" });

const CASES: ReadonlyArray<{ name: string; change: (doc: Damaged) => void; check: () => void }> = [
  {
    name: "the company has no legal name",
    change: (doc) => delete doc.company.legalName,
    check: () => {
      expect(within(header()).queryByText("Harbor Fuels Corporation")).toBeNull();
      expect(within(header()).getByRole("link", { name: /harborfuels\.example/ })).toBeInTheDocument();
    },
  },
  {
    name: "the company's website is null",
    change: (doc) => (doc.company.website = null),
    check: () => {
      expect(within(header()).queryByRole("link", { name: /harborfuels\.example/ })).toBeNull();
      expect(within(header()).getByText("Harbor Fuels Corporation")).toBeInTheDocument();
    },
  },
  {
    name: "the company has no ticker or identity note",
    change: (doc) => {
      delete doc.company.ticker;
      delete doc.company.identityNote;
    },
    check: () => {
      expect(screen.getByText("Public (NYSE: HRBR)")).toBeInTheDocument();
      expect(screen.queryByText(/Which company/)).toBeNull();
    },
  },
  {
    name: "the stats have no cloud and network headline",
    change: (doc) => delete doc.stats.cloudNetwork,
    check: () => expect(within(verdict()).queryByText("Cloud and network")).toBeNull(),
  },
  {
    name: "the fit has no lead",
    change: (doc) => delete doc.fit.lead,
    check: () => {
      expect(within(verdict()).queryByText("Lead with")).toBeNull();
      expect(within(verdict()).getByText("A pending separation plus an open network posting.")).toBeInTheDocument();
    },
  },
  {
    name: "the score is a string",
    change: (doc) => (doc.fit.score = "4"),
    check: () => expect(screen.getAllByRole("img", { name: "Alkira Fit 4 of 5, strong fit" }).length).toBeGreaterThan(0),
  },
  {
    name: "the score is missing",
    change: (doc) => delete doc.fit.score,
    check: () => expect(within(verdict()).getByRole("img", { name: "Alkira Fit: not scored" })).toBeInTheDocument(),
  },
  {
    name: "an angle has no story",
    change: (doc) => delete doc.angles[0].story,
    check: () => {
      expect(within(firstAngle()).queryByRole("heading", { name: "Customer story" })).toBeNull();
      expect(within(firstAngle()).getByRole("heading", { name: "Lubricants separation needs its own network" })).toBeInTheDocument();
    },
  },
  {
    name: "an angle has no answer",
    change: (doc) => delete doc.angles[0].alkira,
    check: () => expect(within(firstAngle()).queryByText("What Alkira does")).toBeNull(),
  },
  {
    name: "an angle has no evidence",
    change: (doc) => delete doc.angles[0].evidence,
    check: () => {
      expect(within(firstAngle()).queryByText("Evidence")).toBeNull();
      expect(within(firstAngle()).getByText("Michaels")).toBeInTheDocument();
    },
  },
  {
    name: "an angle has no use case or title",
    change: (doc) => {
      delete doc.angles[0].useCase;
      delete doc.angles[0].title;
    },
    check: () => {
      expect(within(firstAngle()).queryByText("M&A")).toBeNull();
      // It is still a card with a name: its number stands in for the missing title.
      expect(screen.getByRole("article", { name: "Angle 1" })).toBeInTheDocument();
    },
  },
  {
    name: "an evidence line has a null date and no sources",
    change: (doc) => {
      doc.angles[0].evidence[0].date = null;
      delete doc.angles[0].evidence[0].sources;
    },
    check: () => {
      expect(within(firstAngle()).getByText("Source undated")).toBeInTheDocument();
      expect(within(firstAngle()).getByText("Harbor plans to separate Lubricants as a new public company.")).toBeInTheDocument();
      expect(within(firstAngle()).queryByRole("link", { name: /^Source 1/ })).toBeNull();
    },
  },
  {
    name: "sources are not all numbers",
    change: (doc) => (doc.angles[0].evidence[0].sources = ["1", null, "x", 2.5, 99]),
    check: () => {
      // "1" is read as 1; what is not a whole number is dropped; 99 cites nothing, so it is not a link.
      expect(within(firstAngle()).getByRole("link", { name: /^Source 1/ })).toHaveAttribute("href", "#ref-1");
      expect(within(firstAngle()).getByText("99").tagName).toBe("SPAN");
    },
  },
  {
    name: "an evidence line is not an object, or has no text",
    change: (doc) => (doc.angles[0].evidence = [null, "loose text", { date: "2026-07-28", sources: [1] }, ...doc.angles[0].evidence]),
    check: () => expect(within(firstAngle()).getAllByRole("listitem")).toHaveLength(2),
  },
  {
    name: "a reference has a null address and no source type",
    change: (doc) => {
      doc.references[0].url = null;
      delete doc.references[0].sourceType;
      delete doc.references[0].openPosting;
    },
    check: () => {
      const row = within(screen.getByRole("region", { name: "References" })).getAllByRole("listitem")[0];
      expect(within(row).queryByRole("link")).toBeNull();
      expect(within(row).getByText("Harbor Fuels press release: separation of Lubricants")).toBeInTheDocument();
      expect(within(row).getByText("Second-hand")).toBeInTheDocument();
    },
  },
  {
    name: "a reference's number is a string, and another has none",
    change: (doc) => {
      doc.references[0].n = "1";
      delete doc.references[2].n;
    },
    check: () => {
      const rows = within(screen.getByRole("region", { name: "References" })).getAllByRole("listitem");
      expect(rows.map((row) => row.id)).toEqual(["ref-1", "ref-2", "ref-3"]);
    },
  },
  {
    name: "a person has no name, note or sources",
    change: (doc) => (doc.people = [{ role: "Head of network" }, { name: null, role: null }, null]),
    check: () => {
      const people = screen.getByRole("region", { name: "Who to talk to" });
      expect(within(people).getByText("Head of network")).toBeInTheDocument();
      expect(within(people).getAllByRole("listitem")).toHaveLength(1);
    },
  },
  {
    name: "a snapshot line has no text, and another is null",
    change: (doc) => {
      delete doc.snapshot.clouds.text;
      doc.snapshot.wan = null;
    },
    check: () => {
      const sheet = screen.getByRole("region", { name: "For the engineer" });
      expect(within(sheet).getAllByText("Not found in public sources.")).toHaveLength(4);
    },
  },
  {
    name: "a question has only its text",
    change: (doc) => (doc.questions = [{ question: "Who owns the cutover?" }, { listenFor: "No question here." }]),
    check: () => {
      expect(screen.getByText("Who owns the cutover?")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /Copy question/ })).toHaveLength(1);
    },
  },
  {
    name: "the lists of unknowns hold things that are not text",
    change: (doc) => {
      doc.unconfirmed = [null, "Which regions connect.", { text: "nested" }, ""];
      doc.raiseScore = [undefined];
    },
    check: () => {
      expect(screen.getByText("Which regions connect.")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "What would raise the score" })).toBeNull();
    },
  },
  {
    name: "the research note and generated date are missing",
    change: (doc) => {
      delete doc.research;
      delete doc.generated;
    },
    check: () => {
      expect(screen.queryByText(/searches/)).toBeNull();
      expect(screen.getByText("CONFIDENTIAL")).toBeInTheDocument();
    },
  },
  {
    name: "the deal fields hold values this page does not know",
    change: (doc) => {
      doc.angles[0].dealStatus = "rumoured";
      doc.angles[0].dealDate = 20260728;
      doc.angles[0].dealPendingQuote = null;
    },
    check: () => expect(within(firstAngle()).queryByText(/Pending deal|Deal completed/)).toBeNull(),
  },
  {
    name: "an angle is not an object",
    change: (doc) => (doc.angles = [null, "an angle", 7, doc.angles[0]]),
    check: () => expect(screen.getAllByRole("article")).toHaveLength(1),
  },
  {
    name: "the document is a newer version with fields this page does not know",
    change: (doc) => {
      doc.version = 9;
      doc.audience = { tier: "enterprise" };
      doc.angles[0].confidence = 0.8;
      doc.references[0].archivedAt = "2026-10-06";
    },
    check: () => expect(screen.getByRole("heading", { name: "Why this account, why now" })).toBeInTheDocument(),
  },
];

describe("a document with a field missing, null or of the wrong type", () => {
  for (const { name, change, check } of CASES) {
    it(`still renders when ${name}`, () => {
      const brief = damaged(change);

      expect(readDoc(brief)).not.toBeNull();
      expect(() => renderPage(brief)).not.toThrow();
      expect(screen.getByRole("heading", { level: 1, name: "Harbor Fuels" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Download PDF" })).toBeInTheDocument();
      check();
    });
  }
});

describe("readDoc", () => {
  it("reads a well-formed document back unchanged", () => {
    expect(readDoc(DOC_BRIEF)).toEqual(DOC);
  });

  it("returns nothing for a legacy response, with or without the field", () => {
    expect(readDoc(RICH_BRIEF)).toBeNull();
    expect(readDoc({ ...RICH_BRIEF, format: 1, doc: null })).toBeNull();
  });

  it("returns nothing for a document that is missing a whole section or is another format, so the page falls back", () => {
    expect(readDoc(damaged((raw) => delete raw.angles))).toBeNull();
    expect(readDoc(damaged((raw) => (raw.fit = "strong")))).toBeNull();
    expect(readDoc(damaged((raw) => (raw.format = 3)))).toBeNull();
    expect(readDoc({ ...DOC_BRIEF, doc: "{}" } as unknown as BriefDetail)).toBeNull();
    expect(readDoc({ ...DOC_BRIEF, doc: [] } as unknown as BriefDetail)).toBeNull();
  });

  it("gives the same reading for the same response, so the page does not rebuild it on every render", () => {
    expect(readDoc(DOC_BRIEF)).toBe(readDoc(DOC_BRIEF));
  });

  it("gives every nested value a safe default", () => {
    const doc = readDoc(
      damaged((raw) => {
        raw.company = {};
        raw.stats = {};
        raw.fit = {};
        raw.snapshot = {};
        raw.angles = [{ title: "Only a title" }];
        raw.people = [{ role: "Network lead" }];
        raw.questions = [{ question: "Why now?" }];
        raw.references = [{ title: "A page" }];
      }),
    );

    expect(doc?.company).toEqual({ name: "", legalName: "", ticker: "", website: "", identityNote: "" });
    expect(doc?.fit).toEqual({ score: 0, verdict: "", lead: "" });
    expect(doc?.snapshot.plantNetworks).toEqual({ text: "", sources: [] });
    expect(doc?.angles[0]).toEqual({
      title: "Only a title",
      useCase: "",
      evidence: [],
      alkira: "",
      story: { id: "", customer: "", result: "" },
      dealDate: "",
      dealStatus: "none",
      dealPendingQuote: "",
    });
    expect(doc?.people[0]).toEqual({ name: "", role: "Network lead", note: "", sources: [] });
    expect(doc?.questions[0]).toEqual({ question: "Why now?", listenFor: "", alkiraAngle: "", angle: 0 });
    expect(doc?.references[0]).toEqual({ n: 1, title: "A page", url: "", date: "", sourceType: "second_hand", openPosting: false });
  });

  it("keeps the score within the scale", () => {
    expect(readDoc(damaged((raw) => (raw.fit.score = 11)))?.fit.score).toBe(5);
    expect(readDoc(damaged((raw) => (raw.fit.score = -2)))?.fit.score).toBe(0);
    expect(readDoc(damaged((raw) => (raw.fit.score = "high")))?.fit.score).toBe(0);
  });
});
