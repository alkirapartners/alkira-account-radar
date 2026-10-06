import { describe, expect, it } from "vitest";

import { docCopy } from "@/lib/brief-doc-copy";
import { SECTION_ID, docSections, resolveSection } from "@/lib/brief-sections";

import { DOC, DOC_LABELS_EN } from "../doc-fixture";

const ORDER = [SECTION_ID.whyNow, SECTION_ID.ask, SECTION_ID.engineer, SECTION_ID.people, SECTION_ID.references];

function resolve(change: Partial<Parameters<typeof resolveSection>[0]>): string | null {
  return resolveSection({ order: ORDER, inBand: new Set(), chosen: "", isEndInView: false, previous: null, ...change });
}

describe("docSections", () => {
  it("lists the sections a document has, in page order, under short names", () => {
    expect(docSections(DOC, DOC_LABELS_EN, docCopy("en"))).toEqual([
      { id: "why-now", label: "Why now" },
      { id: "ask-this", label: "Ask this" },
      { id: "engineer", label: "For the engineer" },
      { id: "who-to-talk-to", label: "Who to talk to" },
      { id: "references", label: "References" },
    ]);
  });

  it("leaves out a section the page will not show", () => {
    const sparse = { ...DOC, angles: [], people: [], questions: [], references: [] };
    expect(docSections(sparse, DOC_LABELS_EN, docCopy("en")).map((section) => section.id)).toEqual(["engineer"]);
  });
});

describe("resolveSection", () => {
  it("takes the section crossing the reading line, the earliest when two do", () => {
    expect(resolve({ inBand: new Set([SECTION_ID.people]) })).toBe(SECTION_ID.people);
    expect(resolve({ inBand: new Set([SECTION_ID.engineer, SECTION_ID.ask]) })).toBe(SECTION_ID.ask);
  });

  it("prefers the section the reader jumped to when it shares the line with another", () => {
    // "Ask this" and "For the engineer" sit side by side, so both cross the line together.
    const inBand = new Set([SECTION_ID.ask, SECTION_ID.engineer]);
    expect(resolve({ inBand, chosen: SECTION_ID.engineer })).toBe(SECTION_ID.engineer);
    // A jump made earlier, to a section no longer on the line, does not hold.
    expect(resolve({ inBand: new Set([SECTION_ID.people]), chosen: SECTION_ID.engineer })).toBe(SECTION_ID.people);
    // Other anchors on the page (a reference row, an angle) are not sections.
    expect(resolve({ inBand, chosen: "ref-3" })).toBe(SECTION_ID.ask);
  });

  it("keeps the last section read while the line is between two", () => {
    expect(resolve({ previous: SECTION_ID.ask })).toBe(SECTION_ID.ask);
    expect(resolve({})).toBeNull();
  });

  it("names the last section at the foot of the page, where it cannot reach the line", () => {
    expect(resolve({ isEndInView: true, inBand: new Set([SECTION_ID.people]) })).toBe(SECTION_ID.references);
    expect(resolve({ isEndInView: true, previous: SECTION_ID.people })).toBe(SECTION_ID.references);
  });
});
