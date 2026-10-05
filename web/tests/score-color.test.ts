import { describe, expect, it } from "vitest";
import { BAND_LABEL, BAND_TONE, scoreBand } from "@/lib/score-color";

describe("scoreBand", () => {
  it.each([
    [10, "hot"], [8, "hot"], [7, "warm"], [5, "warm"], [4, "cool"], [1, "cool"],
  ])("score %i → %s", (score, expected) => {
    expect(scoreBand(score)).toBe(expected);
  });
  it("null is unknown", () => expect(scoreBand(null)).toBe("unknown"));
});

describe("band presentation", () => {
  it("names and tones every band", () => {
    const bands = ["hot", "warm", "cool", "unknown"] as const;

    bands.forEach((band) => {
      expect(BAND_LABEL[band]).toBeTruthy();
      expect(BAND_TONE[band]).toBeTruthy();
    });
  });

  it("calls a low score a skip and gives only hot accounts the accent", () => {
    expect(BAND_LABEL.cool).toBe("Skip");
    expect(BAND_TONE.hot).toBe("accent");
    expect(BAND_TONE.warm).not.toBe("accent");
  });
});
