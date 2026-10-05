import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SummaryPills } from "@/components/radar/summary-pills";
import { exactTime, relativeTime } from "@/lib/relative-time";
import { summarize } from "@/lib/row-state";
import type { Batch } from "@/lib/types";

import { BatchView } from "./batch-view";

const API_INTERNAL = process.env.RADAR_API_INTERNAL ?? "http://127.0.0.1:8601";

export const metadata: Metadata = { title: "Radar batch" };

async function loadBatch(id: string, authEmail: string | null): Promise<Batch | null> {
  const res = await fetch(`${API_INTERNAL}/api/radar/batch/${encodeURIComponent(id)}`, {
    cache: "no-store",
    headers: authEmail ? { "X-Auth-Email": authEmail } : undefined,
  });
  if (res.status === 404 || res.status === 401) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestHeaders = await headers();
  const batch = await loadBatch(id, requestHeaders.get("x-auth-email"));
  if (!batch) notFound();

  const count = batch.results.length;

  return (
    <div className="page pb-20 pt-4 sm:pt-6">
      <Link
        href="/radar"
        className="group inline-flex h-9 items-center gap-1.5 rounded-full pr-3 text-sm font-medium text-ink-2 transition-colors duration-fast hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4 transition-transform duration-fast ease-out group-hover:-translate-x-0.5" aria-hidden="true" />
        Account Radar
      </Link>
      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[clamp(2rem,1.2rem+3vw,3.25rem)] font-semibold leading-[1.05] tracking-display">
            <span className="num">{count}</span> {count === 1 ? "account" : "accounts"}
          </h1>
          <p className="mt-3 text-sm text-ink-2">
            Scored{" "}
            <time dateTime={batch.created_at} title={exactTime(batch.created_at)}>
              {relativeTime(batch.created_at)}
            </time>
          </p>
        </div>
        <SummaryPills summary={summarize(batch.results)} />
      </header>
      <div className="mt-8">
        <BatchView batch={batch} />
      </div>
    </div>
  );
}
