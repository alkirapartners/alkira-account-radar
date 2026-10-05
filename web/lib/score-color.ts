import type { PillTone } from "@/components/ui/pill";

export type ScoreBand = "hot" | "warm" | "cool" | "unknown";

export function scoreBand(score: number | null): ScoreBand {
  if (score == null) return "unknown";
  if (score >= 8) return "hot";
  if (score >= 5) return "warm";
  return "cool";
}

/** What each band is called on screen. A low score is a "skip", not a judgement of the company. */
export const BAND_LABEL: Record<ScoreBand, string> = {
  hot: "Hot",
  warm: "Warm",
  cool: "Skip",
  unknown: "Not scored",
};

/** The pill tone for each band, drawn from the design tokens. */
export const BAND_TONE: Record<ScoreBand, PillTone> = {
  hot: "accent",
  warm: "warning",
  cool: "neutral",
  unknown: "neutral",
};
