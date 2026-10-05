"use client";

import { useEffect, useState } from "react";

const SECOND_MS = 1000;

/** Whole seconds since `startedAt`, ticking once a second. */
export function useElapsedSeconds(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt == null) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), SECOND_MS);
    return () => clearInterval(timer);
  }, [startedAt]);

  return startedAt == null ? 0 : Math.max(0, Math.floor((now - startedAt) / SECOND_MS));
}

/** 83 → "1:23" */
export function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
