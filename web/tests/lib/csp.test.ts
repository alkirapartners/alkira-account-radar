import { describe, expect, it } from "vitest";

import { SECURITY_HEADERS, buildCsp } from "@/lib/csp";

const directives = (csp: string) =>
  Object.fromEntries(
    csp.split(";").map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name, values];
    }),
  );

describe("buildCsp", () => {
  const production = directives(buildCsp("abc123", false));

  it("allows scripts only from this site and only with this request's nonce", () => {
    expect(production["script-src"]).toEqual(["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
    expect(production["script-src"]).not.toContain("'unsafe-inline'");
    expect(production["script-src"]).not.toContain("'unsafe-eval'");
  });

  it("permits eval only in development, where React's debugging needs it", () => {
    expect(directives(buildCsp("abc123", true))["script-src"]).toContain("'unsafe-eval'");
  });

  it("keeps everything else on this origin", () => {
    expect(production["default-src"]).toEqual(["'self'"]);
    expect(production["connect-src"]).toEqual(["'self'"]);
    expect(production["font-src"]).toEqual(["'self'"]);
    expect(production["img-src"]).toEqual(["'self'", "data:", "blob:"]);
    expect(production["form-action"]).toEqual(["'self'"]);
    expect(production["base-uri"]).toEqual(["'self'"]);
  });

  it("forbids framing and plugins", () => {
    expect(production["frame-ancestors"]).toEqual(["'none'"]);
    expect(production["object-src"]).toEqual(["'none'"]);
  });

  it("allows inline styles, which the animation library and server-rendered markup rely on", () => {
    // A nonce here would make browsers ignore 'unsafe-inline', breaking style attributes.
    expect(production["style-src"]).toEqual(["'self'", "'unsafe-inline'"]);
  });

  it("is a single line with no stray whitespace", () => {
    const csp = buildCsp("abc123", false);
    expect(csp).not.toMatch(/\n|\s{2,}/);
    expect(csp.endsWith(";")).toBe(false);
  });

  it("does not upgrade requests, so a plain-HTTP local preview keeps working", () => {
    expect(production).not.toHaveProperty("upgrade-insecure-requests");
  });
});

describe("SECURITY_HEADERS", () => {
  it("sets the standard hardening headers", () => {
    expect(SECURITY_HEADERS).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    expect(SECURITY_HEADERS["Permissions-Policy"]).toContain("camera=()");
  });
});
