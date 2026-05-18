import { ResultRow } from "./result-row";
import type { ResultRow as Row } from "@/lib/types";

interface Props {
  rows: Row[];
  briefgenUrl: string;
  sortByScore?: boolean;
}

export function ResultsTable({ rows, briefgenUrl, sortByScore = false }: Props) {
  const sorted = sortByScore
    ? [...rows].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    : rows;
  return (
    <section aria-label="Account scoring results" className="space-y-3">
      {sorted.map((row) => (
        <ResultRow key={row.id} row={row} briefgenUrl={briefgenUrl} />
      ))}
    </section>
  );
}

export function summarize(rows: Row[]): {
  hot: number; warm: number; cool: number; pending: number; error: number;
} {
  let hot = 0, warm = 0, cool = 0, pending = 0, error = 0;
  for (const r of rows) {
    if (r.status === "pending") pending++;
    else if (r.status === "error") error++;
    else if ((r.score ?? 0) >= 8) hot++;
    else if ((r.score ?? 0) >= 5) warm++;
    else cool++;
  }
  return { hot, warm, cool, pending, error };
}
