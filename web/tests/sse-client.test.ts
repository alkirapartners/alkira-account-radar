import { describe, expect, it } from "vitest";
import { parseSSELine } from "@/lib/sse-client";

describe("parseSSELine", () => {
  it("returns null for empty/comment lines", () => {
    expect(parseSSELine("")).toBeNull();
    expect(parseSSELine(":heartbeat")).toBeNull();
  });
  it("parses data: <json>", () => {
    const ev = parseSSELine('data: {"type":"result","batch_id":"b1","index":0,"row":{"score":8}}');
    expect(ev).toEqual({
      type: "result", batch_id: "b1", index: 0, row: { score: 8 },
    });
  });
  it("returns null on malformed JSON", () => {
    expect(parseSSELine("data: not json")).toBeNull();
  });
});
