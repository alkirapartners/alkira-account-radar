import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ResultsTable, summarize } from "@/components/results-table";
import type { Batch } from "@/lib/types";

const API_INTERNAL = process.env.RADAR_API_INTERNAL ?? "http://127.0.0.1:8601";
const BRIEFGEN_URL =
  process.env.NEXT_PUBLIC_BRIEFGEN_URL ?? "https://briefgen.partners.alkira.cc";

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
  const h = await headers();
  const authEmail = h.get("x-auth-email");
  const batch = await loadBatch(id, authEmail);
  if (!batch) notFound();

  const summary = summarize(batch.results);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <Link href="/" className="text-sm text-accent hover:underline">← Back to new batch</Link>
      <header>
        <h1 className="text-2xl font-bold">Batch {batch.id.slice(0, 8)}</h1>
        <p className="text-sm text-ink/60">
          {batch.unique_count} accounts · {new Date(batch.created_at).toLocaleString()}
        </p>
        <p className="mt-2 text-sm font-medium">
          {summary.hot} hot (8+), {summary.warm} warm (5–7), {summary.cool} skip (1–4)
          {summary.error > 0 ? `, ${summary.error} errored` : ""}
        </p>
      </header>
      <ResultsTable rows={batch.results} briefgenUrl={BRIEFGEN_URL} sortByScore />
    </main>
  );
}
