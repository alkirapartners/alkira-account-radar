import { describe, expect, it } from "vitest";
import { parseReferences, parseStarters, splitStats } from "@/lib/brief-content";
import { MAX_COMPANY_CHARS, cleanCompany } from "@/lib/prefill";
import { exactTime, relativeTime } from "@/lib/relative-time";
import { FIT_LABEL, averageScore, fitTier } from "@/lib/score";

describe("cleanCompany", () => {
  it.each([null, undefined, "", "   "])("returns nothing for %p", (raw) => {
    expect(cleanCompany(raw)).toBe("");
  });

  it("collapses whitespace and line breaks", () => {
    expect(cleanCompany("  Acme \n Corp\t")).toBe("Acme Corp");
  });

  it("replaces control characters with spaces", () => {
    expect(cleanCompany("Acme\u0000Corp\u0007")).toBe("Acme Corp");
  });

  it("accepts a name at the limit and ignores one over it", () => {
    expect(cleanCompany("x".repeat(MAX_COMPANY_CHARS))).toHaveLength(MAX_COMPANY_CHARS);
    expect(cleanCompany("x".repeat(MAX_COMPANY_CHARS + 1))).toBe("");
  });
});

describe("fitTier", () => {
  it.each([
    [5, "strong"], [4, "strong"], [3, "moderate"], [2, "weak"], [1, "weak"], [0, "none"],
  ] as const)("rates %i of 5 as %s", (score, tier) => {
    expect(fitTier(score, 5)).toBe(tier);
  });

  it.each([
    [10, "strong"], [8, "strong"], [7, "moderate"], [5, "moderate"], [4, "weak"], [1, "weak"],
  ] as const)("rates %i of 10 as %s", (score, tier) => {
    expect(fitTier(score, 10)).toBe(tier);
  });

  it("treats a missing score as not scored", () => {
    expect(fitTier(null, 10)).toBe("none");
    expect(fitTier(undefined, 5)).toBe("none");
    expect(FIT_LABEL.none).toBe("Not scored");
  });
});

describe("averageScore", () => {
  it("averages scored briefs and ignores unscored ones", () => {
    expect(averageScore([5, 4, 0, 3])).toBe(4);
  });

  it("has no average when nothing is scored", () => {
    expect(averageScore([0, 0])).toBeNull();
    expect(averageScore([])).toBeNull();
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-10-05T12:00:00Z");
  const before = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  it.each([
    [10_000, "just now"],
    [MINUTE, "1 minute ago"],
    [5 * MINUTE, "5 minutes ago"],
    [HOUR, "1 hour ago"],
    [3 * HOUR, "3 hours ago"],
    [DAY, "yesterday"],
    [2 * DAY, "2 days ago"],
    [6 * DAY, "6 days ago"],
  ])("describes %i ms ago as %s", (ms, text) => {
    expect(relativeTime(before(ms), now)).toBe(text);
  });

  it("switches to a date after a week", () => {
    expect(relativeTime("2026-09-12T15:00:00Z", now)).toBe("Sep 12, 2026");
  });

  it("returns nothing for a value that is not a date", () => {
    expect(relativeTime("", now)).toBe("");
    expect(relativeTime("not a date", now)).toBe("");
    expect(exactTime("not a date")).toBe("");
  });

  it("never reports the future", () => {
    expect(relativeTime(new Date(now.getTime() + HOUR).toISOString(), now)).toBe("just now");
  });
});

describe("parseStarters", () => {
  it("separates the numbered questions from the notes before them", () => {
    const md = [
      "**Stakeholders:** CIO, VP Network",
      "",
      "**Best First Question:** Lead with question #1.",
      "",
      '1. "How\'s the Azure-AWS connectivity going?"',
      "2. “What’s the timeline on zero trust?”",
    ].join("\n");

    expect(parseStarters(md)).toEqual({
      notes: ["**Stakeholders:** CIO, VP Network", "**Best First Question:** Lead with question #1."],
      questions: [
        { text: "How's the Azure-AWS connectivity going?", hint: "" },
        { text: "What’s the timeline on zero trust?", hint: "" },
      ],
      closing: [],
    });
  });

  it("keeps each question's listening note with that question", () => {
    const md = [
      "**Stakeholders:** CIO",
      "",
      '1. "What happens when the WAN contract ends?"',
      "   *(You're listening for: timeline pressure, manual work.)*",
      "",
      '2. "How are the acquisitions connected today?"',
      "*(Listening for: overlapping systems.)*",
    ].join("\n");

    expect(parseStarters(md)).toEqual({
      notes: ["**Stakeholders:** CIO"],
      questions: [
        { text: "What happens when the WAN contract ends?", hint: "You're listening for: timeline pressure, manual work." },
        { text: "How are the acquisitions connected today?", hint: "Listening for: overlapping systems." },
      ],
      closing: [],
    });
  });

  it("keeps the notes after the last question apart from that question's listening note", () => {
    const md = [
      '1. "How many tools are you juggling?"',
      "   *(You're listening for: tool sprawl.)*",
      "",
      "**Validate early:**",
      "- Find out if they still pay for old MPLS lines.",
      "- Ask who owns the network budget.",
    ].join("\n");

    expect(parseStarters(md)).toEqual({
      notes: [],
      questions: [{ text: "How many tools are you juggling?", hint: "You're listening for: tool sprawl." }],
      closing: [
        "**Validate early:**",
        "- Find out if they still pay for old MPLS lines.",
        "- Ask who owns the network budget.",
      ],
    });
  });

  it("handles an empty section", () => {
    expect(parseStarters("")).toEqual({ notes: [], questions: [], closing: [] });
  });
});

describe("parseReferences", () => {
  it("reads numbered references with a title and link", () => {
    const md = "[1] TestCo 10-K — https://example.com/10k\n[2] CIO interview - https://example.com/interview";

    expect(parseReferences(md)).toEqual({
      references: [
        { index: "1", title: "TestCo 10-K", url: "https://example.com/10k" },
        { index: "2", title: "CIO interview", url: "https://example.com/interview" },
      ],
      rest: "",
    });
  });

  it("keeps lines it cannot read, and never accepts a non-web link", () => {
    const md = "[1] Bad — javascript:alert(1)\nSee also the annual report.";

    expect(parseReferences(md)).toEqual({
      references: [],
      rest: "[1] Bad — javascript:alert(1)\nSee also the annual report.",
    });
  });
});

describe("splitStats", () => {
  it("splits a stats line into labelled values", () => {
    expect(splitStats("HQ: Austin, TX | Revenue: $5B | Industry: Software")).toEqual([
      { label: "HQ", value: "Austin, TX" },
      { label: "Revenue", value: "$5B" },
      { label: "Industry", value: "Software" },
    ]);
  });

  it("keeps an unlabelled part and drops empty ones", () => {
    expect(splitStats("Private company | | Founded: 1998")).toEqual([
      { label: "", value: "Private company" },
      { label: "Founded", value: "1998" },
    ]);
    expect(splitStats("")).toEqual([]);
  });
});
