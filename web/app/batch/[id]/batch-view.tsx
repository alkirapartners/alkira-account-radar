"use client";

import { useState } from "react";
import { ResultsTable } from "@/components/results-table";
import { deleteResult } from "@/lib/api-client";
import type { Batch, ResultRow } from "@/lib/types";

interface Props {
  batch: Batch;
  briefgenUrl: string;
}

export function BatchView({ batch, briefgenUrl }: Props) {
  const [rows, setRows] = useState<ResultRow[]>(batch.results);

  async function handleDelete(resultId: string) {
    try {
      await deleteResult(resultId);
      setRows((prev) => prev.filter((r) => r.id !== resultId));
    } catch (err) {
      console.error("Failed to delete result:", err);
    }
  }

  return (
    <ResultsTable rows={rows} briefgenUrl={briefgenUrl} sortByScore onDelete={handleDelete} />
  );
}
