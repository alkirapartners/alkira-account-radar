import { ResultRow } from "./result-row";
import type { ResultRow as Row } from "@/lib/types";

interface Props {
  rows: Row[];
  sortByScore?: boolean;
  onDelete?: (id: string) => void;
}

export function ResultsTable({ rows, sortByScore = false, onDelete }: Props) {
  const sorted = sortByScore
    ? [...rows].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    : rows;
  return (
    <section aria-label="Account scoring results" className="space-y-3">
      {sorted.map((row) => (
        <ResultRow key={row.id} row={row} onDelete={onDelete} />
      ))}
    </section>
  );
}
