import type { SSEEvent } from "./types";

export function parseSSELine(line: string): SSEEvent | null {
  if (!line || line.startsWith(":")) return null;
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.slice(6)) as SSEEvent;
  } catch {
    return null;
  }
}

export interface SSESubscription {
  close(): void;
}

export function subscribeToBatch(
  batchId: string,
  onEvent: (e: SSEEvent) => void,
  onError?: (err: unknown) => void,
): SSESubscription {
  const url = `/api/radar/run/${encodeURIComponent(batchId)}`;
  const source = new EventSource(url, { withCredentials: true });
  source.onmessage = (msg) => {
    const ev = parseSSELine(`data: ${msg.data}`);
    if (ev) onEvent(ev);
  };
  source.onerror = (err) => onError?.(err);
  return { close: () => source.close() };
}
