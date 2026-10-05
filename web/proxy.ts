import { NextResponse, type NextRequest } from "next/server";

import { SECURITY_HEADERS, buildCsp } from "@/lib/csp";

/**
 * Gives every page request a fresh nonce and a Content-Security-Policy built
 * around it. Next.js reads the policy from the request headers and stamps the
 * nonce onto its own scripts, which is why the layout renders dynamically.
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: the APIs set their own headers, and static files need no policy.
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|woff2)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
