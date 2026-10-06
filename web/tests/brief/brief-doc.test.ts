import { describe, expect, it } from "vitest";

import {
  displayUrl,
  emphasiseNumbers,
  evidenceColumns,
  evidenceDate,
  isProofPoint,
  readDoc,
  readableDate,
  referenceDate,
  referenceTitle,
  saysUndated,
  splitCustomer,
  splitLead,
  splitMetric,
} from "@/lib/brief-doc";
import { docCopy, nameOfUseCase } from "@/lib/brief-doc-copy";
import type { BriefDetail, BriefDoc } from "@/lib/brief-types";
import { tokenizeTech } from "@/lib/tech-terms";

import { DOC, DOC_BRIEF, DOC_LABELS_EN } from "../doc-fixture";
import { RICH_BRIEF } from "../fixtures";

describe("readDoc", () => {
  it("returns the document a response carries", () => {
    expect(readDoc(DOC_BRIEF)).toBe(DOC);
  });

  it("returns nothing for a legacy response, with or without the field", () => {
    expect(readDoc(RICH_BRIEF)).toBeNull();
    expect(readDoc({ ...RICH_BRIEF, format: 1, doc: null })).toBeNull();
  });

  it("returns nothing for a document that is missing a section, so the page falls back", () => {
    const broken = { ...DOC, angles: undefined } as unknown as BriefDoc;
    expect(readDoc({ ...DOC_BRIEF, doc: broken })).toBeNull();
    expect(readDoc({ ...DOC_BRIEF, doc: "{}" } as unknown as BriefDetail)).toBeNull();
  });
});

describe("readableDate", () => {
  it("writes a stored date the way people do, to the precision it has", () => {
    expect(readableDate("2026-07-28", "en")).toBe("28 Jul 2026");
    expect(readableDate("2026-09", "en")).toBe("Sep 2026");
    expect(readableDate("2026", "en")).toBe("2026");
    expect(readableDate("2026-07-28", "es")).toBe("28 jul 2026");
  });

  it("gives nothing for text that is not a stored date", () => {
    expect(readableDate("", "en")).toBe("");
    expect(readableDate("last spring", "en")).toBe("");
    expect(readableDate("2026-13-01", "en")).toBe("");
  });
});

describe("evidenceDate", () => {
  const [release, posting] = DOC.references;

  it("reads a line dated by its source as dated", () => {
    expect(evidenceDate({ date: "2026-07-28", sources: [1] }, DOC.references, "en")).toEqual({
      kind: "dated",
      date: "28 Jul 2026",
    });
  });

  it("reads a line dated by an open posting as seen on that day", () => {
    expect(evidenceDate({ date: posting.date, sources: [2] }, DOC.references, "en")).toEqual({
      kind: "open",
      date: "6 Oct 2026",
    });
    // The posting is cited, but the line's date is another source's.
    expect(evidenceDate({ date: release.date, sources: [1, 2] }, DOC.references, "en").kind).toBe("dated");
  });

  it("reads a line with no date, or one it cannot read, as undated", () => {
    expect(evidenceDate({ date: "", sources: [3] }, DOC.references, "en")).toEqual({ kind: "undated", date: "" });
    expect(evidenceDate({ date: "recently", sources: [3] }, DOC.references, "en").kind).toBe("undated");
  });

  it("dates a reference the same way", () => {
    expect(referenceDate(posting, "en")).toEqual({ kind: "open", date: "6 Oct 2026" });
    expect(referenceDate(release, "en")).toEqual({ kind: "dated", date: "28 Jul 2026" });
    expect(referenceDate(DOC.references[2], "en").kind).toBe("undated");
  });
});

describe("proof", () => {
  it("tells a knowledge-base figure from a named customer story", () => {
    expect(isProofPoint(DOC.angles[0].story)).toBe(false);
    expect(isProofPoint(DOC.angles[1].story)).toBe(true);
  });

  it("splits a figure from the metric it measures", () => {
    expect(splitMetric("Network provisioning speed improvement: 80%.")).toEqual({
      name: "Network provisioning speed improvement",
      figure: "80%",
      rest: "",
    });
    expect(splitMetric("Firewall reduction: 73% (up to 82% in some accounts).")).toEqual({
      name: "Firewall reduction",
      figure: "73%",
      rest: "(up to 82% in some accounts)",
    });
    expect(splitMetric("TCO reduction: 40-60%.").figure).toBe("40-60%");
    expect(splitMetric("Cloud app deployment increase: Up to 1650%.").figure).toBe("Up to 1650%");
  });

  it("keeps a result with no figure whole", () => {
    expect(splitMetric("Faster everywhere.")).toEqual({ name: "", figure: "", rest: "Faster everywhere." });
  });

  it("separates a study from the customer it describes", () => {
    expect(splitCustomer("A software company (Nemertes study)")).toEqual({
      name: "A software company",
      qualifier: "Nemertes study",
    });
    expect(splitCustomer("Koch Industries")).toEqual({ name: "Koch Industries", qualifier: "" });
  });

  it("marks the numbers in a result so they can be set heavier", () => {
    const parts = emphasiseNumbers("About 1,400 stores connected in three weeks, a 1650% increase.");

    expect(parts.filter((part) => part.strong).map((part) => part.text)).toEqual(["1,400", "three weeks", "1650%"]);
    expect(parts.map((part) => part.text).join("")).toBe("About 1,400 stores connected in three weeks, a 1650% increase.");
  });

  it("leaves a result with no numbers as one plain part", () => {
    expect(emphasiseNumbers("Simpler operations.")).toEqual([{ text: "Simpler operations.", strong: false }]);
  });
});

describe("references", () => {
  it("drops the open-posting note from a title, because the row says it", () => {
    expect(referenceTitle(DOC.references[1], DOC_LABELS_EN)).toBe("Harbor Fuels careers: Network Engineer");
    expect(referenceTitle(DOC.references[0], DOC_LABELS_EN)).toBe("Harbor Fuels press release: separation of Lubricants");
  });

  it("shows an address without its scheme, and whatever it was given when it is not an address", () => {
    expect(displayUrl("https://www.harborfuels.example/press/2026/separation")).toBe("harborfuels.example/press/2026/separation");
    expect(displayUrl("https://example.com/")).toBe("example.com");
    expect(displayUrl("not an address")).toBe("not an address");
  });
});

describe("splitLead", () => {
  it("opens with the first sentence of the lead and keeps the rest", () => {
    expect(splitLead("Open with the separation. Call the network lead. Bring the design.")).toEqual({
      first: "Open with the separation.",
      rest: "Call the network lead. Bring the design.",
    });
    expect(splitLead("Open with the separation")).toEqual({ first: "Open with the separation", rest: "" });
  });
});

describe("evidenceColumns", () => {
  it("spreads evidence across the card so no row is left with a hole", () => {
    expect([1, 2, 3, 4, 6].map(evidenceColumns)).toEqual([1, 2, 3, 2, 3]);
  });

  it("uses three columns for any other count", () => {
    expect(evidenceColumns(5)).toBe(3);
    expect(evidenceColumns(0)).toBe(1);
  });
});

describe("saysUndated", () => {
  it("knows when a line already says its source is undated, in either language", () => {
    expect(saysUndated("Runs in AWS China (undated AWS partner case study).")).toBe(true);
    expect(saysUndated("Según un caso de estudio sin fecha.")).toBe(true);
    expect(saysUndated("The case study gives no date.")).toBe(true);
  });

  it("does not mistake other words for it", () => {
    expect(saysUndated("Overseas revenue was 96.62% of the 2025 total.")).toBe(false);
    expect(saysUndated("The plan was updated in May.")).toBe(false);
  });
});

describe("copy", () => {
  it("names each use case in the brief's language", () => {
    expect(nameOfUseCase("m_and_a", "en")).toBe("M&A");
    expect(nameOfUseCase("multi_cloud", "es")).toBe("Multinube");
    // A use case this page does not know yet still reads as words.
    expect(nameOfUseCase("edge_compute", "en")).toBe("Edge compute");
  });

  it("falls back to English for a language it has no copy for", () => {
    expect(docCopy("fr").askThis).toBe(docCopy("en").askThis);
  });
});

describe("tokenizeTech", () => {
  const terms = (text: string) =>
    tokenizeTech(text)
      .filter((token) => token.term)
      .map((token) => token.text);

  it("picks out products, vendors and protocols", () => {
    expect(terms("ExpressRoute, VPN, Azure Virtual WAN hub-and-spoke, BGP")).toEqual([
      "ExpressRoute",
      "VPN",
      "Azure Virtual WAN",
      "BGP",
    ]);
    expect(terms("Palo Alto, Fortinet or similar next-generation firewalls")).toEqual(["Palo Alto", "Fortinet"]);
    expect(terms("SD-WAN across data center, campus and branch networks")).toEqual(["SD-WAN"]);
  });

  it("keeps slashed acronyms together and leaves everyday capitals alone", () => {
    expect(terms("SSE/SASE familiarity and IT/OT segmentation in the US")).toEqual(["SSE/SASE", "IT/OT"]);
    expect(terms("The CIO owns IT for the UK")).toEqual([]);
  });

  it("returns the whole text, in order", () => {
    const text = "AWS Direct Connect, and a dedicated line between AWS China (Beijing) and the US";
    expect(tokenizeTech(text).map((token) => token.text).join("")).toBe(text);
    expect(tokenizeTech("")).toEqual([]);
  });
});
