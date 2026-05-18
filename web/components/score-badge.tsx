import { scoreBand, scoreColor } from "@/lib/score-color";

export function ScoreBadge({ score }: { score: number | null }) {
  const band = scoreBand(score);
  const color = scoreColor(score);
  return (
    <div
      className="inline-flex items-center justify-center rounded-lg px-3 py-1 text-sm font-semibold text-white shadow-sm"
      style={{ backgroundColor: color }}
      aria-label={`Score ${score ?? "unknown"} (${band})`}
    >
      {score == null ? "—" : `${score}/10`}
    </div>
  );
}
