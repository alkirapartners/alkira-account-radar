import Link from "next/link";
import type { BatchSummary } from "@/lib/types";

interface Props {
  batches: BatchSummary[];
  activeId?: string;
}

export function HistorySidebar({ batches, activeId }: Props) {
  return (
    <nav aria-label="Past batches" className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/50">
        Past Batches
      </h2>
      {batches.length === 0 ? (
        <p className="text-sm text-ink/50">No batches yet.</p>
      ) : (
        <ul className="space-y-1">
          {batches.map((b) => (
            <li key={b.id}>
              <Link
                href={{ pathname: `/batch/${b.id}` }}
                className={`block rounded-md px-3 py-2 text-sm hover:bg-ink/5 ${
                  activeId === b.id ? "bg-ink/5 font-medium" : ""
                }`}
              >
                {b.unique_count} accounts
                <span className="ml-2 text-ink/50">
                  {new Date(b.created_at).toLocaleDateString()}
                </span>
                {b.status === "running" ? (
                  <span className="ml-2 text-xs text-amber-600">running…</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
