import type { BriefStreamEvent, Envelope, Language } from "./brief-types";
import { ApiError, SessionExpiredError, isSignInResponse } from "./session";

export const DROPPED_MESSAGE =
  "The connection dropped. Your brief may still finish. Check your briefs in a minute.";

const FALLBACK_ERROR = "Something went wrong. Please try again.";
const FRAME_END = "\n\n";
const DATA_PREFIX = "data: ";

type OnEvent = (event: BriefStreamEvent) => void;

/** Split a buffer of server-sent events into parsed events and the unfinished tail. */
export function parseFrames(buffer: string): { events: BriefStreamEvent[]; rest: string } {
  const frames = buffer.split(FRAME_END);
  const rest = frames.pop() ?? "";
  const events: BriefStreamEvent[] = [];
  for (const frame of frames) {
    for (const line of frame.split("\n")) {
      if (!line.startsWith(DATA_PREFIX)) continue; // heartbeats are comment lines
      try {
        events.push(JSON.parse(line.slice(DATA_PREFIX.length)) as BriefStreamEvent);
      } catch {
        // A malformed frame is dropped. If it was the result, the missing
        // terminal event is reported as a dropped connection below.
      }
    }
  }
  return { events, rest };
}

async function refusal(res: Response): Promise<ApiError> {
  try {
    const envelope = (await res.json()) as Envelope<unknown>;
    return new ApiError(res.status, envelope.error || FALLBACK_ERROR);
  } catch {
    return new ApiError(res.status, FALLBACK_ERROR);
  }
}

async function run(url: string, body: unknown, onEvent: OnEvent, signal?: AbortSignal): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (isSignInResponse(res)) throw new SessionExpiredError();
  if (!res.ok || !res.body) throw await refusal(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const parsed = parseFrames(buffer + decoder.decode(value, { stream: true }));
    buffer = parsed.rest;
    for (const event of parsed.events) {
      if (event.type === "done" || event.type === "error") finished = true;
      onEvent(event);
    }
  }

  // The server keeps writing the brief even if this stream is cut short.
  if (!finished) onEvent({ type: "error", message: DROPPED_MESSAGE });
}

export function generateBrief(
  input: { company: string; language: Language },
  onEvent: OnEvent,
  signal?: AbortSignal,
): Promise<void> {
  return run("/api/brief/briefs", input, onEvent, signal);
}

export function refreshBrief(
  id: string,
  input: { language?: Language },
  onEvent: OnEvent,
  signal?: AbortSignal,
): Promise<void> {
  return run(`/api/brief/briefs/${encodeURIComponent(id)}/refresh`, input, onEvent, signal);
}
