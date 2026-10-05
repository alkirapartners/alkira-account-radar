import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";
import { exactTime, relativeTime } from "@/lib/relative-time";
import type { BatchSummary } from "@/lib/types";

interface HistoryProps {
  batches: BatchSummary[];
  activeId?: string;
}

export function History({ batches, activeId }: HistoryProps) {
  return (
    <nav aria-label="Past batches">
      <h2 className="micro-label">Past batches</h2>
      {batches.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-2">Batches you score will be kept here.</p>
      ) : (
        <ul className="card mt-4 overflow-hidden">
          {batches.map((batch) => {
            const count = batch.remaining_count ?? batch.unique_count;
            const active = activeId === batch.id;
            return (
              <li key={batch.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/radar/batch/${batch.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex min-h-[60px] items-center gap-3 px-5 py-3 transition-colors duration-fast ease-out hover:bg-ink/[0.025]",
                    active && "bg-accent/[0.06]",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">
                      <span className="num">{count}</span> {count === 1 ? "account" : "accounts"}
                    </span>
                    <time dateTime={batch.created_at} title={exactTime(batch.created_at)} className="block text-[13px] text-ink-2">
                      {relativeTime(batch.created_at)}
                      {batch.status === "running" ? " · scoring" : ""}
                    </time>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="h-4 w-4 text-ink-3 transition-[transform,color] duration-fast ease-out group-hover:translate-x-0.5 group-hover:text-ink"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
