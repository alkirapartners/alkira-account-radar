import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useGeneration, type StreamRunner } from "@/components/brief/use-generation";
import * as session from "@/lib/session";
import { ApiError, SessionExpiredError } from "@/lib/session";

describe("useGeneration", () => {
  beforeEach(() => {
    vi.spyOn(session, "goToSignIn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("follows the phases the server reports, then hands over the finished brief", async () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useGeneration(onDone));
    const seen: string[] = [];

    const run: StreamRunner = async (onEvent) => {
      onEvent({ type: "phase", phase: "research" });
      seen.push(JSON.stringify(result.current.state));
      onEvent({ type: "phase", phase: "compose" });
      onEvent({ type: "done", briefId: "b1", reusedFrom: "2026-10-01T00:00:00Z" });
    };
    await act(() => result.current.start("Acme", run));

    expect(result.current.state).toMatchObject({ status: "done", company: "Acme" });
    expect(onDone).toHaveBeenCalledOnce();
    expect(onDone).toHaveBeenCalledWith({ briefId: "b1", reusedFrom: "2026-10-01T00:00:00Z" });
  });

  it("starts in the first phase with the company and a start time", async () => {
    const { result } = renderHook(() => useGeneration(vi.fn()));
    let release: () => void = () => {};
    const run: StreamRunner = () => new Promise<void>((resolve) => (release = resolve));

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.start("Acme", run);
    });

    expect(result.current.state).toMatchObject({ status: "running", company: "Acme", phase: "init" });
    await act(async () => {
      release();
      await pending;
    });
  });

  it("shows the server's message when the stream reports an error", async () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useGeneration(onDone));

    await act(() => result.current.start("Acme", async (onEvent) => onEvent({ type: "error", message: "Try again later." })));

    expect(result.current.state).toEqual({ status: "error", message: "Try again later." });
    expect(onDone).not.toHaveBeenCalled();
  });

  it("shows the refusal message when the request is turned away", async () => {
    const { result } = renderHook(() => useGeneration(vi.fn()));

    await act(() =>
      result.current.start("Acme", async () => {
        throw new ApiError(429, "You've reached today's limit of 50 briefs.");
      }),
    );

    expect(result.current.state).toEqual({ status: "error", message: "You've reached today's limit of 50 briefs." });
  });

  it("explains a network failure without leaking the raw error", async () => {
    const { result } = renderHook(() => useGeneration(vi.fn()));

    await act(() =>
      result.current.start("Acme", async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    expect(result.current.state.status).toBe("error");
    expect(JSON.stringify(result.current.state)).not.toContain("Failed to fetch");
    expect(JSON.stringify(result.current.state)).toMatch(/connection/i);
  });

  it("sends an expired session to sign-in instead of showing an error", async () => {
    const { result } = renderHook(() => useGeneration(vi.fn()));

    await act(() =>
      result.current.start("Acme", async () => {
        throw new SessionExpiredError();
      }),
    );

    expect(session.goToSignIn).toHaveBeenCalledOnce();
    expect(result.current.state.status).not.toBe("error");
  });

  it("returns to idle on reset", async () => {
    const { result } = renderHook(() => useGeneration(vi.fn()));
    await act(() => result.current.start("Acme", async (onEvent) => onEvent({ type: "error", message: "x" })));

    act(() => result.current.reset());

    expect(result.current.state).toEqual({ status: "idle" });
  });
});
