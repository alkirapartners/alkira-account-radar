"use client";

import { Radar } from "lucide-react";
import { m } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AmbientPanel } from "@/components/brief/ambient-panel";
import { useToast } from "@/components/ui/toast";
import { createBatch, deleteBatch, deleteResult, fetchHistory } from "@/lib/api-client";
import { rise, stagger } from "@/lib/motion";
import { formatSummary, summarize } from "@/lib/row-state";
import { subscribeToBatch, type SSESubscription } from "@/lib/sse-client";
import type { BatchSummary, ResultRow } from "@/lib/types";

import { History } from "./history";
import { InputForm } from "./input-form";
import { ResultsList } from "./results-list";
import { SummaryPills } from "./summary-pills";

export function RadarHome() {
  const { toast } = useToast();
  const [history, setHistory] = useState<BatchSummary[]>([]);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [allDone, setAllDone] = useState(false);
  const subscription = useRef<SSESubscription | null>(null);

  // History is a convenience; if it fails to load the page still works, so it stays quiet.
  const refreshHistory = useCallback(() => {
    fetchHistory().then(setHistory).catch(() => setHistory((current) => current));
  }, []);

  useEffect(() => {
    refreshHistory();
    return () => subscription.current?.close();
  }, [refreshHistory]);

  async function handleSubmit(raw: string) {
    const { id } = await createBatch(raw);
    setCurrentBatchId(id);
    setRows([]);
    setAllDone(false);

    subscription.current?.close();
    subscription.current = subscribeToBatch(id, (event) => {
      if (event.type === "pending") {
        const incoming = event.row as ResultRow;
        setRows((current) => (current.some((row) => row.id === incoming.id) ? current : [...current, incoming]));
      } else if (event.type === "result" || (event.type === "error" && event.row)) {
        const incoming = event.row as ResultRow;
        setRows((current) => current.map((row) => (row.id === incoming.id ? { ...row, ...incoming } : row)));
      } else if (event.type === "done") {
        setAllDone(true);
        subscription.current?.close();
        refreshHistory();
      }
    });
  }

  async function handleDelete(resultId: string) {
    try {
      await deleteResult(resultId);
    } catch {
      toast({ title: "That result couldn't be deleted. Try again.", tone: "error" });
      return;
    }
    const remaining = rows.filter((row) => row.id !== resultId);
    setRows(remaining);
    if (remaining.length === 0 && currentBatchId) {
      // The batch is now empty, so it goes too. If this fails it only leaves an empty entry in history.
      await deleteBatch(currentBatchId).catch(() => undefined);
      setCurrentBatchId(null);
      setAllDone(false);
    }
    refreshHistory();
  }

  const summary = summarize(rows);
  const completed = rows.length - summary.pending;
  const scored = summary.hot + summary.warm + summary.cool;
  const running = currentBatchId !== null && !allDone;

  return (
    <m.div variants={stagger(0.07)} initial="hidden" animate="shown" className="page space-y-8 pb-20 pt-4 sm:space-y-10 sm:pt-8">
      <m.div variants={rise}>
        <AmbientPanel>
          <div className="grid items-start gap-10 p-6 sm:p-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14 lg:p-12">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-2.5 pr-3.5 text-[13px] font-medium text-on-ambient">
                <Radar className="h-3.5 w-3.5 text-accent-soft" aria-hidden="true" />
                Account Radar
              </p>
              <h1 className="mt-5 max-w-[14ch] text-[clamp(2rem,1.1rem+3.6vw,3.5rem)] font-semibold leading-[1.04] tracking-display">
                Score your account list.
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-on-ambient-2 sm:text-[17px]">
                Paste up to 40 company names. Each gets a 1&ndash;10 Alkira fit score and three reasons.
              </p>
              <p className="mt-6 max-w-md border-t border-white/10 pt-5 text-sm leading-relaxed text-on-ambient-2">
                Scores are a quick read from general knowledge, not live research. Generate a brief for the full picture.
              </p>
            </div>
            <InputForm onSubmit={handleSubmit} disabled={running} />
          </div>
        </AmbientPanel>
      </m.div>

      <m.div variants={rise} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-10">
        <div className="min-w-0">
          {rows.length > 0 ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-lg font-semibold tracking-heading" aria-live="polite">
                  {allDone
                    ? `${scored} of ${rows.length} scored`
                    : `Scoring… ${completed} of ${rows.length} done`}
                  {allDone ? <span className="sr-only"> — {formatSummary(summary)}</span> : null}
                </p>
                {allDone ? <SummaryPills summary={summary} /> : null}
              </div>
              <ResultsList rows={rows} sortByScore={allDone} onDelete={handleDelete} />
            </div>
          ) : (
            <div className="card flex min-h-[220px] flex-col items-center justify-center px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-accent/10 text-accent" aria-hidden="true">
                <Radar className="h-6 w-6" />
              </span>
              <h2 className="mt-5 text-lg font-semibold tracking-heading">Results will appear here</h2>
              <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-ink-2">
                Each account lands as it is scored, then the list sorts with the best fits on top.
              </p>
            </div>
          )}
        </div>
        <History batches={history} activeId={currentBatchId ?? undefined} />
      </m.div>
    </m.div>
  );
}
