import { describe, expect, it } from "vitest";

import { parseBlocks, parseInline } from "@/lib/inline-markdown";

const text = (value: string) => ({ type: "text", text: value });

describe("parseInline", () => {
  it("leaves plain text alone", () => {
    expect(parseInline("Two clouds, one backbone.")).toEqual([text("Two clouds, one backbone.")]);
  });

  it("reads bold, emphasis and code", () => {
    expect(parseInline("**Stakeholders:** CIO, *VP Network*, `10.0.0.0/8`")).toEqual([
      { type: "strong", children: [text("Stakeholders:")] },
      text(" CIO, "),
      { type: "em", children: [text("VP Network")] },
      text(", "),
      { type: "code", text: "10.0.0.0/8" },
    ]);
  });

  it("reads a web link, including formatting inside its text", () => {
    expect(parseInline("See [the **annual** report](https://example.com/10k).")).toEqual([
      text("See "),
      {
        type: "link",
        href: "https://example.com/10k",
        children: [text("the "), { type: "strong", children: [text("annual")] }, text(" report")],
      },
      text("."),
    ]);
  });

  it.each(["javascript:alert(1)", "data:text/html,x", "vbscript:x", "//evil.example", "/relative", "mailto:a@b.c"])(
    "keeps the text of a link to %s but never its address",
    (address) => {
      const tokens = parseInline(`[click me](${address})`);

      expect(tokens).toEqual([text("click me")]);
      expect(JSON.stringify(tokens)).not.toContain(address);
    },
  );

  it("treats HTML as ordinary text", () => {
    expect(parseInline('<img src="x" onerror="alert(1)">')).toEqual([text('<img src="x" onerror="alert(1)">')]);
  });

  it("does not mistake stray asterisks or brackets for formatting", () => {
    expect(parseInline("5 * 4 = 20 and [not a link] and **unclosed")).toEqual([
      text("5 * 4 = 20 and [not a link] and **unclosed"),
    ]);
  });

  it("returns nothing for an empty string", () => {
    expect(parseInline("")).toEqual([]);
  });
});

describe("parseBlocks", () => {
  it("makes a paragraph of each line and skips blank ones", () => {
    expect(parseBlocks("First line.\n\nSecond line.\n")).toEqual([
      { type: "paragraph", children: [text("First line.")] },
      { type: "paragraph", children: [text("Second line.")] },
    ]);
  });

  it("gathers consecutive bullet lines into one list", () => {
    expect(parseBlocks("Intro\n- one\n* two\nOutro")).toEqual([
      { type: "paragraph", children: [text("Intro")] },
      { type: "list", items: [[text("one")], [text("two")]] },
      { type: "paragraph", children: [text("Outro")] },
    ]);
  });
});
