"use client";

import { useEffect, useState } from "react";
import { InputForm } from "@/components/input-form";
import { HistorySidebar } from "@/components/history-sidebar";
import { ResultsTable, summarize } from "@/components/results-table";
import { createBatch, fetchHistory } from "@/lib/api-client";
import { subscribeToBatch } from "@/lib/sse-client";
import type { BatchSummary, ResultRow } from "@/lib/types";

const BRIEFGEN_URL = process.env.NEXT_PUBLIC_BRIEFGEN_URL ?? "";

export default function Home() {
  const [history, setHistory] = useState<BatchSummary[]>([]);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    fetchHistory().then(setHistory).catch(console.error);
  }, []);

  async function handleSubmit(raw: string) {
    const { id } = await createBatch(raw);
    setCurrentBatchId(id);
    setRows([]);
    setAllDone(false);

    const sub = subscribeToBatch(id, (ev) => {
      if (ev.type === "pending") {
        setRows((prev) => prev.some((r) => r.id === (ev.row as ResultRow).id) ? prev : [...prev, ev.row as ResultRow]);
      } else if (ev.type === "result") {
        setRows((prev) =>
          prev.map((r) => (r.id === ev.row?.id ? { ...r, ...(ev.row as ResultRow) } : r)),
        );
      } else if (ev.type === "done") {
        setAllDone(true);
        sub.close();
        fetchHistory().then(setHistory).catch(console.error);
      }
    });
  }

  const summary = summarize(rows);
  const completed = rows.length - summary.pending;

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="border-r border-ink/10 bg-white p-6">
        <h1 className="mb-6 text-lg font-bold">Account Radar</h1>
        <HistorySidebar batches={history} activeId={currentBatchId ?? undefined} />
      </aside>

      <main className="space-y-8 p-8">
        <header>
          <h2 className="text-2xl font-bold">Score your account list</h2>
          <p className="text-sm text-ink/60">
            Paste up to 40 company names. Each gets a 1–10 Alkira fit score and three bullets.
          </p>
        </header>

        <InputForm onSubmit={handleSubmit} disabled={!!currentBatchId && !allDone} />

        {rows.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm font-medium" aria-live="polite">
              {allDone
                ? `${rows.length} of ${rows.length} scored — ${summary.hot} hot (8+), ${summary.warm} warm (5–7), ${summary.cool} skip (1–4)`
                : `Scoring… ${completed} of ${rows.length} done`}
            </p>
            <ResultsTable rows={rows} briefgenUrl={BRIEFGEN_URL} sortByScore={allDone} />
          </div>
        ) : null}
      </main>
    </div>
  );
}
