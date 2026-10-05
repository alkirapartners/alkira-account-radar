export type FitTier = "strong" | "moderate" | "weak" | "none";

export type ScoreScale = 5 | 10;

/** Lowest score in each tier, per scale. Anything below `weak` is unscored. */
const THRESHOLDS: Record<ScoreScale, { strong: number; moderate: number; weak: number }> = {
  5: { strong: 4, moderate: 3, weak: 1 },
  10: { strong: 8, moderate: 5, weak: 1 },
};

export const FIT_LABEL: Record<FitTier, string> = {
  strong: "Strong fit",
  moderate: "Moderate fit",
  weak: "Weak fit",
  none: "Not scored",
};

export function fitTier(score: number | null | undefined, scale: ScoreScale): FitTier {
  if (score == null) return "none";
  const limits = THRESHOLDS[scale];
  if (score >= limits.strong) return "strong";
  if (score >= limits.moderate) return "moderate";
  if (score >= limits.weak) return "weak";
  return "none";
}

/** Mean of the scored briefs; an unscored brief (0) does not drag it down. */
export function averageScore(scores: number[]): number | null {
  const scored = scores.filter((score) => score > 0);
  if (scored.length === 0) return null;
  return scored.reduce((total, score) => total + score, 0) / scored.length;
}
