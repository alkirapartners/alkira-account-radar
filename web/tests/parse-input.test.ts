import { describe, expect, it } from "vitest";
import { parseAccounts, ParseError } from "@/lib/parse-input";

describe("parseAccounts (parity with Python parser)", () => {
  it("splits on newline", () => {
    const { accounts, unique } = parseAccounts("Acme\nGlobex\nInitech");
    expect(accounts).toEqual(["Acme", "Globex", "Initech"]);
    expect(unique).toBe(3);
  });
  it("splits on comma", () => {
    expect(parseAccounts("Acme, Globex, Initech").accounts)
      .toEqual(["Acme", "Globex", "Initech"]);
  });
  it("splits on tab", () => {
    expect(parseAccounts("Acme\tGlobex\tInitech").accounts)
      .toEqual(["Acme", "Globex", "Initech"]);
  });
  it("mixed delimiters", () => {
    expect(parseAccounts("Acme, Globex\nInitech\tWayne").accounts)
      .toEqual(["Acme", "Globex", "Initech", "Wayne"]);
  });
  it("trims whitespace", () => {
    expect(parseAccounts("  Acme   ,  Globex  ").accounts).toEqual(["Acme", "Globex"]);
  });
  it("drops empties", () => {
    expect(parseAccounts("Acme,, ,\n\nGlobex").accounts).toEqual(["Acme", "Globex"]);
  });
  it("dedupes case-insensitive, preserving first casing", () => {
    const { accounts, unique } = parseAccounts("Acme\nacme\nACME\nGlobex");
    expect(accounts).toEqual(["Acme", "Globex"]);
    expect(unique).toBe(2);
  });
  it("throws on empty", () => {
    expect(() => parseAccounts("")).toThrow(ParseError);
  });
  it("throws on whitespace only", () => {
    expect(() => parseAccounts("   \n\t,,")).toThrow(/at least one account/);
  });
  it("enforces max size", () => {
    const raw = Array.from({ length: 41 }, (_, i) => `Co${i}`).join("\n");
    expect(() => parseAccounts(raw, 40)).toThrow(/40 or fewer/);
  });
});
