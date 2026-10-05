import { scoreBand } from "./score-color";
import type { ResultRow } from "./types";

// A finished row with no score is a company the model did not recognize.
export type RowState = "pending" | "error" | "unscored" | "scored";

export function rowState(row: Pick<ResultRow, "status" | "score">): RowState {
  if (row.status === "pending") return "pending";
  if (row.status === "error") return "error";
  return row.score == null ? "unscored" : "scored";
}

export interface Summary {
  hot: number;
  warm: number;
  cool: number;
  unscored: number;
  pending: number;
  error: number;
}

const EMPTY_SUMMARY: Summary = { hot: 0, warm: 0, cool: 0, unscored: 0, pending: 0, error: 0 };

function bucket(row: ResultRow): keyof Summary {
  const state = rowState(row);
  if (state !== "scored") return state;
  const band = scoreBand(row.score);
  return band === "unknown" ? "unscored" : band;
}

export function summarize(rows: ResultRow[]): Summary {
  return rows.reduce((summary, row) => {
    const key = bucket(row);
    return { ...summary, [key]: summary[key] + 1 };
  }, EMPTY_SUMMARY);
}

export function formatSummary(summary: Summary): string {
  const parts = [
    `${summary.hot} hot (8+)`,
    `${summary.warm} warm (5–7)`,
    `${summary.cool} skip (1–4)`,
    ...(summary.unscored > 0 ? [`${summary.unscored} not scored`] : []),
    ...(summary.error > 0 ? [`${summary.error} errored`] : []),
  ];
  return parts.join(", ");
}

/** Link into the Brief Generator for a finished row; an unscored one falls back to the typed name. */
export function briefHref(row: ResultRow): string | null {
  const state = rowState(row);
  if (state === "pending" || state === "error") return null;
  const params = new URLSearchParams({
    company: row.resolved_name ?? row.account_name,
    ...(row.resolved_domain ? { domain: row.resolved_domain } : {}),
  });
  return `/?${params.toString()}`;
}
