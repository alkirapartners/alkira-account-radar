import type { BriefDetail, BriefSummary, Envelope, Me } from "./brief-types";
import { ApiError, SessionExpiredError, isSignInResponse } from "./session";

const BASE = "/api/brief";
const FALLBACK_ERROR = "Something went wrong. Please try again.";

async function readEnvelope<T>(res: Response): Promise<Envelope<T> | null> {
  try {
    return (await res.json()) as Envelope<T>;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, credentials: "include" });
  if (isSignInResponse(res)) throw new SessionExpiredError();

  const envelope = await readEnvelope<T>(res);
  if (!res.ok || !envelope?.success) {
    throw new ApiError(res.status, envelope?.error || FALLBACK_ERROR);
  }
  return envelope.data as T;
}

const briefPath = (id: string) => `/briefs/${encodeURIComponent(id)}`;

export function getMe(): Promise<Me> {
  return request<Me>("/me");
}

export function listBriefs(): Promise<BriefSummary[]> {
  return request<BriefSummary[]>("/briefs");
}

export function getBrief(id: string): Promise<BriefDetail> {
  return request<BriefDetail>(briefPath(id));
}

export async function deleteBrief(id: string): Promise<void> {
  await request<{ deleted: boolean }>(briefPath(id), { method: "DELETE" });
}

/** A plain link target: the browser downloads it with the session cookie. */
export function pdfHref(id: string): string {
  return `${BASE}${briefPath(id)}/pdf`;
}

/** The Word file, as a plain link target. The API refuses it for a legacy brief, which has no document. */
export function docxHref(id: string): string {
  return `${BASE}${briefPath(id)}/docx`;
}
