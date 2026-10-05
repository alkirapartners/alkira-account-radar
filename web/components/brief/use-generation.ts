"use client";

import { useCallback, useState } from "react";

import type { BriefPhase, BriefStreamEvent } from "@/lib/brief-types";
import { ApiError, SessionExpiredError, goToSignIn } from "@/lib/session";

export type GenerationState =
  | { status: "idle" }
  | { status: "running"; company: string; phase: BriefPhase; startedAt: number }
  | { status: "done"; company: string; startedAt: number }
  | { status: "error"; message: string };

export interface GenerationResult {
  briefId: string;
  reusedFrom: string | null;
}

/** A function that starts the stream and reports its events (generateBrief or refreshBrief, bound). */
export type StreamRunner = (onEvent: (event: BriefStreamEvent) => void) => Promise<void>;

const NETWORK_MESSAGE = "We couldn't reach the server. Check your connection and try again.";

const IDLE: GenerationState = { status: "idle" };

/**
 * Drives one brief generation: tracks the phase the server reports, hands the
 * finished brief to `onDone`, and turns every way it can fail into a message.
 */
export function useGeneration(onDone: (result: GenerationResult) => void) {
  const [state, setState] = useState<GenerationState>(IDLE);

  const start = useCallback(
    async (company: string, run: StreamRunner) => {
      const startedAt = Date.now();
      setState({ status: "running", company, phase: "init", startedAt });

      const handle = (event: BriefStreamEvent) => {
        if (event.type === "phase") {
          setState((current) => (current.status === "running" ? { ...current, phase: event.phase } : current));
        } else if (event.type === "done") {
          setState({ status: "done", company, startedAt });
          onDone({ briefId: event.briefId, reusedFrom: event.reusedFrom });
        } else {
          setState({ status: "error", message: event.message });
        }
      };

      try {
        await run(handle);
      } catch (error) {
        if (error instanceof SessionExpiredError) {
          goToSignIn();
          return;
        }
        setState({ status: "error", message: error instanceof ApiError ? error.message : NETWORK_MESSAGE });
      }
    },
    [onDone],
  );

  const reset = useCallback(() => setState(IDLE), []);

  return { state, start, reset };
}
