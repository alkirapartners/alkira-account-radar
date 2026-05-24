import type { Batch, BatchSummary } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api/radar";

export async function createBatch(raw: string): Promise<{ id: string; unique_count: number }> {
  const res = await fetch(`${BASE}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json();
}

export async function fetchHistory(): Promise<BatchSummary[]> {
  const res = await fetch(`${BASE}/history`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchBatch(batchId: string): Promise<Batch> {
  const res = await fetch(`${BASE}/batch/${encodeURIComponent(batchId)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteResult(resultId: string): Promise<void> {
  const res = await fetch(`${BASE}/result/${encodeURIComponent(resultId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function deleteBatch(batchId: string): Promise<void> {
  const res = await fetch(`${BASE}/batch/${encodeURIComponent(batchId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
