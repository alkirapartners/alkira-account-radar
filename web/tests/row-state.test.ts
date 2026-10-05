import { describe, expect, it } from "vitest";
import { briefHref, formatSummary, rowState, summarize } from "@/lib/row-state";
import type { ResultRow } from "@/lib/types";

function row(overrides: Partial<ResultRow>): ResultRow {
  return {
    id: "r1",
    account_name: "Acme",
    resolved_name: null,
    resolved_domain: null,
    score: null,
    reasons: [],
    status: "done",
    error_message: null,
    ...overrides,
  };
}

describe("rowState", () => {
  it("is pending while the account is still being scored", () => {
    expect(rowState(row({ status: "pending" }))).toBe("pending");
  });

  it("is error when scoring failed", () => {
    expect(rowState(row({ status: "error", error_message: "boom" }))).toBe("error");
  });

  it("is scored when a finished row has a score", () => {
    expect(rowState(row({ score: 8 }))).toBe("scored");
  });

  it("is unscored when a finished row has no score", () => {
    expect(rowState(row({ score: null }))).toBe("unscored");
  });

  it("treats a score missing from the stream payload as unscored", () => {
    const streamed = { ...row({}), score: undefined } as unknown as ResultRow;
    expect(rowState(streamed)).toBe("unscored");
  });
});

describe("summarize", () => {
  it("counts each row in exactly one bucket", () => {
    const summary = summarize([
      row({ score: 9 }),
      row({ score: 8 }),
      row({ score: 6 }),
      row({ score: 3 }),
      row({ score: null }),
      row({ status: "pending" }),
      row({ status: "error" }),
    ]);

    expect(summary).toEqual({ hot: 2, warm: 1, cool: 1, unscored: 1, pending: 1, error: 1 });
  });

  it("does not count an unscored account as a skip", () => {
    expect(summarize([row({ score: null })]).cool).toBe(0);
  });
});

describe("formatSummary", () => {
  it("lists the three score bands", () => {
    const text = formatSummary({ hot: 2, warm: 1, cool: 0, unscored: 0, pending: 0, error: 0 });

    expect(text).toBe("2 hot (8+), 1 warm (5–7), 0 skip (1–4)");
  });

  it("mentions unscored and errored accounts only when there are any", () => {
    const text = formatSummary({ hot: 1, warm: 0, cool: 0, unscored: 2, pending: 0, error: 1 });

    expect(text).toBe("1 hot (8+), 0 warm (5–7), 0 skip (1–4), 2 not scored, 1 errored");
  });
});

describe("briefHref", () => {
  it("links a scored row to the brief generator on the same site", () => {
    const href = briefHref(
      row({ score: 8, resolved_name: "Acme Corporation", resolved_domain: "acme.com" }),
    );

    expect(href).toBe("/?company=Acme+Corporation&domain=acme.com");
  });

  it("falls back to the typed name for an unscored account", () => {
    expect(briefHref(row({ account_name: "Zzyx Holdings" }))).toBe("/?company=Zzyx+Holdings");
  });

  it.each(["pending", "error"] as const)("offers no brief link for a %s row", (status) => {
    expect(briefHref(row({ status }))).toBeNull();
  });
});
