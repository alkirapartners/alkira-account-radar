import { describe, expect, it } from "vitest";

import { briefHref } from "@/components/brief/brief-home";
import { arrangeBriefs } from "@/components/brief/library";
import { STEPS, activeStepIndex } from "@/components/brief/step-tracker";
import { activeTool } from "@/components/shell/tool-tabs";

import { summary } from "../fixtures";

describe("arrangeBriefs", () => {
  const briefs = [
    summary({ id: "a", company: "Acme Robotics", score: 3, createdAt: "2026-10-01T00:00:00Z" }),
    summary({ id: "b", company: "Bluewater Energy", score: 5, createdAt: "2026-10-03T00:00:00Z" }),
    summary({ id: "c", company: "acme freight", score: 5, createdAt: "2026-10-02T00:00:00Z" }),
  ];

  it("orders newest first by default", () => {
    expect(arrangeBriefs(briefs, "", "newest").map((b) => b.id)).toEqual(["b", "c", "a"]);
  });

  it("orders by fit, newest first within the same score", () => {
    expect(arrangeBriefs(briefs, "", "fit").map((b) => b.id)).toEqual(["b", "c", "a"]);
    const reversed = arrangeBriefs([...briefs].reverse(), "", "fit");
    expect(reversed.map((b) => b.id)).toEqual(["b", "c", "a"]);
  });

  it("filters by company name, ignoring case and surrounding spaces", () => {
    expect(arrangeBriefs(briefs, "  ACME ", "newest").map((b) => b.id)).toEqual(["c", "a"]);
    expect(arrangeBriefs(briefs, "zzz", "newest")).toEqual([]);
  });

  it("does not reorder the list it was given", () => {
    const original = briefs.map((b) => b.id);
    arrangeBriefs(briefs, "", "fit");
    expect(briefs.map((b) => b.id)).toEqual(original);
  });
});

describe("briefHref", () => {
  it("opens the new brief", () => {
    expect(briefHref({ briefId: "b1", reusedFrom: null })).toBe("/briefs/b1");
  });

  it("carries the reused-research date, as a date only", () => {
    expect(briefHref({ briefId: "b1", reusedFrom: "2026-09-30T14:22:05.123+00:00" })).toBe("/briefs/b1?reused=2026-09-30");
  });
});

describe("activeStepIndex", () => {
  it("maps each phase to its step, and done to past the last one", () => {
    expect(STEPS.map((step) => activeStepIndex(step.phase))).toEqual([0, 1, 2, 3]);
    expect(activeStepIndex("done")).toBe(STEPS.length);
  });
});

describe("activeTool", () => {
  it.each([
    ["/", "/"],
    ["/briefs/abc", "/"],
    ["/radar", "/radar"],
    ["/radar/batch/xyz", "/radar"],
    ["/radarscope", "/"],
  ])("puts %s under %s", (path, tool) => {
    expect(activeTool(path)).toBe(tool);
  });
});
