export type ScoreBand = "hot" | "warm" | "cool" | "unknown";

export function scoreBand(score: number | null): ScoreBand {
  if (score == null) return "unknown";
  if (score >= 8) return "hot";
  if (score >= 5) return "warm";
  return "cool";
}

const COLORS: Record<ScoreBand, string> = {
  hot: "oklch(62% 0.20 25)",
  warm: "oklch(78% 0.16 75)",
  cool: "oklch(72% 0.06 240)",
  unknown: "oklch(80% 0 0)",
};

export function scoreColor(score: number | null): string {
  return COLORS[scoreBand(score)];
}
