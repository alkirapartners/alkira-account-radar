import { afterEach, describe, expect, it, vi } from "vitest";
import { DROPPED_MESSAGE, generateBrief, parseFrames, refreshBrief } from "@/lib/brief-stream";
import type { BriefStreamEvent } from "@/lib/brief-types";
import { SessionExpiredError } from "@/lib/session";

const frame = (event: unknown) => `data: ${JSON.stringify(event)}\n\n`;

function streamResponse(chunks: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("parseFrames", () => {
  it("parses complete frames and keeps the unfinished remainder", () => {
    const { events, rest } = parseFrames(frame({ type: "phase", phase: "init" }) + 'data: {"type":"ph');

    expect(events).toEqual([{ type: "phase", phase: "init" }]);
    expect(rest).toBe('data: {"type":"ph');
  });

  it("ignores heartbeats", () => {
    const { events } = parseFrames(": ping\n\n" + frame({ type: "phase", phase: "research" }));

    expect(events).toEqual([{ type: "phase", phase: "research" }]);
  });

  it("skips a frame that is not valid JSON", () => {
    expect(parseFrames("data: {nope\n\n").events).toEqual([]);
  });
});

describe("generateBrief", () => {
  it("reassembles frames split across chunks", async () => {
    const whole =
      frame({ type: "phase", phase: "init" }) + frame({ type: "done", briefId: "b1", reusedFrom: null });
    stubFetch(streamResponse([whole.slice(0, 11), whole.slice(11, 40), whole.slice(40)]));
    const seen: BriefStreamEvent[] = [];

    await generateBrief({ company: "Acme", language: "en" }, (event) => seen.push(event));

    expect(seen).toEqual([
      { type: "phase", phase: "init" },
      { type: "done", briefId: "b1", reusedFrom: null },
    ]);
  });

  it("posts JSON with the session cookie", async () => {
    const fetchMock = stubFetch(streamResponse([frame({ type: "done", briefId: "b1", reusedFrom: null })]));

    await generateBrief({ company: "Acme", language: "es" }, () => {});

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/brief/briefs");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ company: "Acme", language: "es" });
  });

  it("reports a dropped connection when the stream ends with no result", async () => {
    stubFetch(streamResponse([frame({ type: "phase", phase: "compose" })]));
    const seen: BriefStreamEvent[] = [];

    await generateBrief({ company: "Acme", language: "en" }, (event) => seen.push(event));

    expect(seen.at(-1)).toEqual({ type: "error", message: DROPPED_MESSAGE });
  });

  it("does not add a dropped-connection error after a real error event", async () => {
    stubFetch(streamResponse([frame({ type: "error", message: "Try again." })]));
    const seen: BriefStreamEvent[] = [];

    await generateBrief({ company: "Acme", language: "en" }, (event) => seen.push(event));

    expect(seen).toEqual([{ type: "error", message: "Try again." }]);
  });

  it("surfaces the server's message when the request is refused", async () => {
    const body = JSON.stringify({ success: false, data: null, error: "A brief is already being written for you." });
    stubFetch(new Response(body, { status: 409, headers: { "Content-Type": "application/json" } }));

    await expect(generateBrief({ company: "Acme", language: "en" }, () => {})).rejects.toMatchObject({
      name: "ApiError",
      status: 409,
      message: "A brief is already being written for you.",
    });
  });

  it("falls back to a generic message when a refusal has no readable body", async () => {
    stubFetch(new Response("upstream timed out", { status: 504, headers: { "Content-Type": "text/plain" } }));

    await expect(generateBrief({ company: "Acme", language: "en" }, () => {})).rejects.toMatchObject({
      name: "ApiError",
      status: 504,
    });
  });

  it("treats the sign-in page as an expired session", async () => {
    stubFetch(new Response("<html></html>", { status: 200, headers: { "Content-Type": "text/html" } }));

    await expect(generateBrief({ company: "Acme", language: "en" }, () => {})).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
  });
});

describe("refreshBrief", () => {
  it("posts to the brief's refresh address", async () => {
    const fetchMock = stubFetch(streamResponse([frame({ type: "done", briefId: "b2", reusedFrom: null })]));

    await refreshBrief("abc 123", {}, () => {});

    expect(fetchMock.mock.calls[0][0]).toBe("/api/brief/briefs/abc%20123/refresh");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({});
  });
});
