import { ScoreBadge } from "./score-badge";
import { briefHref, rowState } from "@/lib/row-state";
import type { ResultRow as Row } from "@/lib/types";

interface Props {
  row: Row;
  onDelete?: (id: string) => void;
}

export function ResultRow({ row, onDelete }: Props) {
  const state = rowState(row);
  const handoff = briefHref(row);
  // A row still streaming in has no reasons field yet.
  const reasons = row.reasons ?? [];

  return (
    <article className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <ScoreBadge score={row.score} />
          <div>
            <h3 className="font-semibold leading-tight">
              {row.resolved_name ?? row.account_name}
            </h3>
            {row.resolved_domain ? (
              <p className="text-sm text-ink/60">{row.resolved_domain}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {handoff ? (
            <a
              href={handoff}
              className="rounded-md border border-ink/15 px-3 py-1.5 text-sm font-medium hover:bg-ink/5"
            >
              Generate brief →
            </a>
          ) : null}
          {onDelete && state !== "pending" ? (
            <button
              onClick={() => onDelete(row.id)}
              className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              aria-label="Delete result"
            >
              Delete
            </button>
          ) : null}
        </div>
      </header>

      {state === "pending" ? (
        <p className="mt-3 text-sm italic text-ink/60" role="status">
          Scoring…
        </p>
      ) : state === "error" ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {row.error_message ?? "Failed to score this account."}
        </p>
      ) : state === "unscored" ? (
        <p className="mt-3 text-sm text-ink/70">
          Not enough is known about this account for a quick score. Generate a brief to
          research it.
        </p>
      ) : (
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm marker:text-accent">
          {reasons.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      )}
    </article>
  );
}
