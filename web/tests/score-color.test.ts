import { describe, expect, it } from "vitest";
import { scoreBand, scoreColor } from "@/lib/score-color";

describe("scoreBand", () => {
  it.each([
    [10, "hot"], [8, "hot"], [7, "warm"], [5, "warm"], [4, "cool"], [1, "cool"],
  ])("score %i → %s", (score, expected) => {
    expect(scoreBand(score)).toBe(expected);
  });
  it("null is unknown", () => expect(scoreBand(null)).toBe("unknown"));
});

describe("scoreColor", () => {
  it("returns a non-empty color for each band", () => {
    [10, 7, 3, null].forEach((s) => expect(scoreColor(s as number | null)).toBeTruthy());
  });
});
