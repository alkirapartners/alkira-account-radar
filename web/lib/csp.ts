/**
 * The Content-Security-Policy for one request. Scripts run only from this
 * origin and only when they carry this request's nonce; nothing else loads
 * from anywhere but here.
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  // React uses eval in development to rebuild server error stacks in the browser.
  if (isDev) scriptSrc.push("'unsafe-eval'");

  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    ["script-src", scriptSrc],
    // Inline styles are allowed: the animation library and server-rendered
    // markup set style attributes. Adding a nonce here would make browsers
    // ignore 'unsafe-inline'.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:"]],
    ["font-src", ["'self'"]],
    ["connect-src", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["object-src", ["'none'"]],
  ];

  return directives.map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");
}

/** Hardening headers that do not vary per request. HSTS is left to the load balancer, which terminates TLS. */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
