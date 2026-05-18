export type ResultStatus = "pending" | "done" | "error";
export type BatchStatus = "running" | "done" | "error";

export interface ResultRow {
  id: string;
  account_name: string;
  resolved_name: string | null;
  resolved_domain: string | null;
  score: number | null;
  fit_bullet: string | null;
  objection_bullet: string | null;
  action_bullet: string | null;
  sources: string[];
  status: ResultStatus;
  error_message: string | null;
}

export interface Batch {
  id: string;
  status: BatchStatus;
  input_count: number;
  unique_count: number;
  created_at: string;
  completed_at: string | null;
  results: ResultRow[];
}

export interface BatchSummary {
  id: string;
  status: BatchStatus;
  unique_count: number;
  created_at: string;
}

export type SSEEvent =
  | { type: "pending"; batch_id: string; index: number; row: Partial<ResultRow> }
  | { type: "result"; batch_id: string; index: number; row: Partial<ResultRow> }
  | { type: "done"; batch_id: string }
  | { type: "error"; batch_id: string; row?: Partial<ResultRow> };
