"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ResultsTable } from "@/components/results-table";
import { deleteResult, deleteBatch } from "@/lib/api-client";
import type { Batch, ResultRow } from "@/lib/types";

interface Props {
  batch: Batch;
}

export function BatchView({ batch }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<ResultRow[]>(batch.results);

  useEffect(() => {
    if (rows.length === 0 && batch.results.length > 0) {
      deleteBatch(batch.id).catch(console.error);
      router.push("/radar");
    }
  }, [rows, batch.id, batch.results.length, router]);

  async function handleDelete(resultId: string) {
    try {
      await deleteResult(resultId);
      setRows((prev) => prev.filter((r) => r.id !== resultId));
    } catch (err) {
      console.error("Failed to delete result:", err);
    }
  }

  return (
    <ResultsTable rows={rows} sortByScore onDelete={handleDelete} />
  );
}
