"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ResultsList } from "@/components/radar/results-list";
import { useToast } from "@/components/ui/toast";
import { deleteBatch, deleteResult } from "@/lib/api-client";
import type { Batch, ResultRow } from "@/lib/types";

interface BatchViewProps {
  batch: Batch;
}

export function BatchView({ batch }: BatchViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState<ResultRow[]>(batch.results);

  // Deleting the last result removes the batch and returns to the radar.
  useEffect(() => {
    if (rows.length === 0 && batch.results.length > 0) {
      // If this fails it only leaves an empty entry in history.
      deleteBatch(batch.id).catch(() => undefined);
      router.push("/radar");
    }
  }, [rows, batch.id, batch.results.length, router]);

  async function handleDelete(resultId: string) {
    try {
      await deleteResult(resultId);
      setRows((current) => current.filter((row) => row.id !== resultId));
    } catch {
      toast({ title: "That result couldn't be deleted. Try again.", tone: "error" });
    }
  }

  return <ResultsList rows={rows} sortByScore onDelete={handleDelete} />;
}
