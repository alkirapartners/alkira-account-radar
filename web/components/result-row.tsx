import { ScoreBadge } from "./score-badge";
import type { ResultRow as Row } from "@/lib/types";

interface Props {
  row: Row;
  briefgenUrl: string;
}

export function ResultRow({ row, briefgenUrl }: Props) {
  const isPending = row.status === "pending";
  const isError = row.status === "error";

  const handoff = (() => {
    if (!row.resolved_name) return null;
    const params = new URLSearchParams({
      company: row.resolved_name,
      ...(row.resolved_domain ? { domain: row.resolved_domain } : {}),
    });
    return `${briefgenUrl}/?${params.toString()}`;
  })();

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
        {handoff ? (
          <a
            href={handoff}
            className="rounded-md border border-ink/15 px-3 py-1.5 text-sm font-medium hover:bg-ink/5"
          >
            Generate brief →
          </a>
        ) : null}
      </header>

      {isPending ? (
        <p className="mt-3 text-sm italic text-ink/60" role="status">
          Researching…
        </p>
      ) : isError ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {row.error_message ?? "Failed to score this account."}
        </p>
      ) : (
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-green-700">Fit:</dt>
            <dd>{row.fit_bullet}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-amber-700">Objection:</dt>
            <dd>{row.objection_bullet}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-accent">Action:</dt>
            <dd>{row.action_bullet}</dd>
          </div>
        </dl>
      )}
    </article>
  );
}
