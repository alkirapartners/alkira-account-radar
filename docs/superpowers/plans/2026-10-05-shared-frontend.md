# Shared Front End Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the radar's Next.js app into the single front end for the Brief Generator and Account Radar, with one design system, purposeful motion on every screen, and no Streamlit anywhere.

**Architecture:** `basePath` is removed; radar pages move under `/radar` and the Brief Generator takes `/` and `/briefs/[id]`. Tokens live in CSS variables mapped into Tailwind. Logic sits in `web/lib/` under unit tests; components are built against a local mock API and reviewed by screenshot, since their markup and motion can only be judged running.

**Tech Stack:** Next.js 16.2 (App Router), React 19.2, Tailwind 3.4, `motion`, `@tanstack/react-query`, `react-markdown`, `@radix-ui/react-dialog`, `lucide-react`, Vitest + Testing Library, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-10-05-shared-frontend-design.md` (sections 2, 5, 6, 8). The Brief API it talks to is planned in `CLEAR-brief-gen/docs/superpowers/plans/2026-10-05-brief-api.md`.

**Why component code is not pre-written here:** logic modules below carry their tests and code. Component markup, spacing and motion are written against the running app and accepted by the per-task criteria and screenshots, because a blind transcription cannot be judged for look.

## Global Constraints

- Branch: `feature/shared-frontend`, cut from `main`. Do not push; the session owner opens the PR.
- All work is inside `web/` except docs. The radar API (`api/`) is not changed.
- Radar keeps every feature it has. Its lib tests (`row-state`, `parse-input`, `score-color`, `sse-client`) keep passing.
- Light theme only. Tokens from spec section 6: canvas `#F5F5F3`, surface `#FFFFFF`, sunken `#EFEFED`, ambient `#0D0D0E`, text `#141414` / `#6B7280` / `#9CA3AF`, accent `#2D58F2`, radius 20 / 12 / full.
- Two font families: Inter (variable, optical sizing) and JetBrains Mono (numerals only), committed under `web/app/fonts/` and loaded with `next/font/local`. No runtime or build-time font fetch.
- Motion: transform and opacity only; 150ms responses, 250ms arrivals, 400ms maximum for morphs; ease-out in, ease-in out; springs for pills and reordering; everything interruptible. Under reduced motion: fades only, counts jump to their final value, the glow holds still.
- No `dangerouslySetInnerHTML`. Brief section text is rendered with `react-markdown` (no raw HTML).
- No `console.log`. No hardcoded colours or spacing in components; use the tokens.
- Accessibility: contrast 4.5:1 or better, visible focus rings, full keyboard operation, 44px touch targets, visible form labels.
- App pages stay under 300kb gzipped first-load JS.
- Files 200 to 400 lines typical, 800 maximum; components in feature folders.
- Commit messages: conventional format, no attribution trailer.

## Review Focus

1. **Session expires while the page is open.** nginx answers API calls with a redirect to `/auth.html`. The page must send the browser to sign-in, not render HTML as data or show a broken state. Test: `brief-api.test.ts` "treats a redirect to the sign-in page as an expired session".
2. **The stream ends without a `done` or `error` event** (server restart, network drop). The UI must stop the progress view and tell the partner the brief may still finish. Test: `brief-stream.test.ts` "reports a dropped connection".
3. **Stream frames split across network chunks**, plus heartbeat comment lines. Test: `brief-stream.test.ts` "reassembles frames split across chunks" and "ignores heartbeats".
4. **A brief with missing sections** (score 0, no entry points, empty starters). The page must show designed empty tiles, not blank holes or a crash. Test: `brief-view.test.tsx` "renders a sparse brief without empty shells".
5. **Model-written markdown that tries to carry HTML or a `javascript:` link.** It must render as inert text. Test: `markdown.test.tsx` "does not render raw HTML or unsafe links".

## File Structure

```
web/
  app/
    layout.tsx                 fonts, providers, shell
    page.tsx                   Brief Generator home
    briefs/[id]/page.tsx       one brief
    radar/page.tsx             moved from app/page.tsx
    radar/batch/[id]/...       moved from app/batch/[id]/
    not-found.tsx
    fonts/                     Inter + JetBrains Mono woff2, licences
  components/
    providers.tsx              QueryClient, LazyMotion, MotionConfig, toasts
    shell/                     top-bar, tool-tabs, user-menu
    ui/                        button, text-field, segmented-control, pill, score-meter,
                               count-up, dialog, toast, skeleton, copy-button, markdown
    brief/                     generate-box, step-tracker, stats-row, library, library-row,
                               brief-view, brief-header, tiles/*
    radar/                     input-form, results-table, result-row, history, score-badge
  lib/
    brief-types.ts  brief-api.ts  brief-stream.ts  prefill.ts  score.ts
    relative-time.ts  motion.ts  session.ts
    (existing radar lib files unchanged except row-state.ts briefHref)
  styles/tokens.css  styles/typography.css
  dev/mock-api.mjs             fixtures for /api/brief and /api/radar, with simulated streams
  proxy.ts                     nonce-based CSP and security headers
```

---

### Task 1: Restructure routing and add the mock API

**Files:** `next.config.ts`, move `app/page.tsx` to `app/radar/page.tsx` and `app/batch/` to `app/radar/batch/`, `components/history-sidebar.tsx`, `lib/row-state.ts`, `tests/row-state.test.ts`, `dev/mock-api.mjs`, `package.json`, `playwright.config.ts`, `tests/e2e/flow.spec.ts`

**Interfaces:**
- Produces: routes `/radar` and `/radar/batch/[id]`; `briefHref(row: ResultRow): string | null` replacing `briefUrl(row, briefgenUrl)`; npm scripts `dev:mock` and `mock`; dev rewrite for `/api/brief/:path*`.

- [ ] **Step 1: Change `briefHref` test-first.** In `tests/row-state.test.ts` replace the `briefUrl` cases with:

```ts
import { briefHref } from "@/lib/row-state";

const base = { id: "r1", account_name: "acme", resolved_name: "Acme Corp", resolved_domain: "acme.com",
  score: 8, reasons: [], status: "done" as const, error_message: null };

test("links a scored row to the brief generator on the same site", () => {
  expect(briefHref(base)).toBe("/?company=Acme+Corp&domain=acme.com");
});
test("falls back to the typed name when the company was not recognised", () => {
  expect(briefHref({ ...base, resolved_name: null, resolved_domain: null, score: null }))
    .toBe("/?company=acme");
});
test("gives no link while a row is pending or errored", () => {
  expect(briefHref({ ...base, status: "pending" })).toBeNull();
  expect(briefHref({ ...base, status: "error" })).toBeNull();
});
```

Run `npm test` in `web/`: FAIL (`briefHref` is not exported). Then in `lib/row-state.ts`:

```ts
/** Link into the Brief Generator for a finished row; an unscored one falls back to the typed name. */
export function briefHref(row: ResultRow): string | null {
  const state = rowState(row);
  if (state === "pending" || state === "error") return null;
  const params = new URLSearchParams({
    company: row.resolved_name ?? row.account_name,
    ...(row.resolved_domain ? { domain: row.resolved_domain } : {}),
  });
  return `/?${params.toString()}`;
}
```

Remove `briefUrl` and every `briefgenUrl` prop and `NEXT_PUBLIC_BRIEFGEN_URL` read.

- [ ] **Step 2: Routing.** `next.config.ts` becomes:

```ts
import type { NextConfig } from "next";

const RADAR_API = process.env.RADAR_API_INTERNAL ?? "http://127.0.0.1:8601";
const BRIEF_API = process.env.BRIEF_API_INTERNAL ?? "http://127.0.0.1:8501";

// In production nginx routes /api/* itself; these rewrites serve local development.
const config: NextConfig = {
  typedRoutes: true,
  async rewrites() {
    return [
      { source: "/api/radar/:path*", destination: `${RADAR_API}/api/radar/:path*` },
      { source: "/api/brief/:path*", destination: `${BRIEF_API}/api/brief/:path*` },
    ];
  },
};

export default config;
```

`git mv` the radar pages under `app/radar/`. Fix links: history rows to `/radar/batch/${id}`, "Back" to `/radar`, `router.push("/radar")`.

- [ ] **Step 3: Mock API.** `dev/mock-api.mjs` is a dependency-free `node:http` server on port 8599 that serves, from in-file fixtures: `GET /api/brief/me`, `GET /api/brief/briefs`, `GET /api/brief/briefs/:id` (one rich brief, one sparse brief, one Spanish brief, 404 otherwise), `POST /api/brief/briefs` and `POST .../refresh` (SSE: `init`, `research`, `analyze`, `compose` then `done`, with a heartbeat; delays scaled by `MOCK_SPEED`, default 1, e2e uses 0.02), `DELETE`, a small valid PDF, and the radar endpoints (`POST /api/radar/run`, `GET /api/radar/run/:id` SSE, `history`, `batch/:id`, deletes). A company named `fail` produces an `error` event; `drop` closes the stream early; `busy` answers 409 in the envelope. Responses use the real envelope and the real radar shapes from `lib/types.ts`.

Scripts:

```json
"mock": "node dev/mock-api.mjs",
"dev:mock": "BRIEF_API_INTERNAL=http://127.0.0.1:8599 RADAR_API_INTERNAL=http://127.0.0.1:8599 next dev -p 3100"
```

- [ ] **Step 4: Verify.** `npm test` passes; `npm run build` passes; with `npm run mock` and `npm run dev:mock` running, `/radar` scores three accounts end to end and `/radar/batch/<id>` opens. Commit: `refactor: serve the radar under /radar and add a local mock API`.

---

### Task 2: Design tokens, fonts, motion presets

**Files:** `styles/tokens.css`, `styles/typography.css`, `app/globals.css`, `tailwind.config.ts`, `app/fonts/*`, `app/layout.tsx`, `lib/motion.ts`, `components/providers.tsx`, `package.json`

**Interfaces:**
- Produces: CSS variables (`--canvas`, `--surface`, `--sunken`, `--ambient`, `--text`, `--text-2`, `--text-3`, `--accent`, `--accent-tint`, `--positive`, `--warning`, `--negative` with tints, `--border`, `--shadow-card`, `--shadow-lift`, `--radius-card`, `--radius-inner`, `--dur-fast`, `--dur-base`, `--dur-slow`, `--ease-out`, `--ease-in`); Tailwind colours `canvas, surface, sunken, ambient, ink, ink-2, ink-3, accent, positive, warning, negative`; `font-sans`, `font-mono`; `lib/motion.ts` exports `DUR`, `EASE_OUT`, `EASE_IN`, `SPRING_PILL`, `SPRING_LAYOUT`, `rise` (variants), `stagger(step = 0.04)`.

- [ ] Install `motion @tanstack/react-query react-markdown @radix-ui/react-dialog lucide-react`; dev: `@testing-library/react @testing-library/user-event @testing-library/jest-dom @axe-core/playwright @fontsource-variable/inter @fontsource-variable/jetbrains-mono`. Copy the Latin variable woff2 files and OFL licences from the fontsource packages into `app/fonts/`, then remove the two fontsource packages.
- [ ] Write the tokens, map them in `tailwind.config.ts`, load fonts with `next/font/local` (`display: "swap"`, CSS variables `--font-sans`, `--font-mono`), set `font-feature-settings` for tabular numerals on `.font-mono`, a global focus ring (`outline: 2px solid var(--accent); outline-offset: 2px` on `:focus-visible`), selection colour, and a `prefers-reduced-motion` block that zeroes CSS transitions and stops the glow.
- [ ] `components/providers.tsx`: `QueryClientProvider` (stale time 30s, no retry on 4xx), `LazyMotion` loading `domMax` through a dynamic import, `MotionConfig reducedMotion="user"`, toast region.
- [ ] Verify: build passes; the radar still renders (unstyled classes will be replaced in Task 7). Commit: `feat: add the design tokens, fonts and motion presets`.

---

### Task 3: Brief client library (full TDD)

**Files:** `lib/brief-types.ts`, `lib/session.ts`, `lib/brief-api.ts`, `lib/brief-stream.ts`, `lib/prefill.ts`, `lib/score.ts`, `lib/relative-time.ts`, and a test file for each under `tests/`

**Interfaces (produced):**

```ts
// brief-types.ts
export type Language = "en" | "es";
export type BriefPhase = "init" | "research" | "analyze" | "compose";
export interface Me { email: string; isAdmin: boolean }
export interface BriefSummary { id: string; company: string; score: number; snippet: string; language: Language; createdAt: string }
export interface EntryPoint { heading: string; signal: string; solution: string; proof: string }
export interface BriefDetail {
  id: string; company: string; statsLine: string; score: number; scoreRationale: string;
  infra: { cloudPlatforms: string; onPrem: string; deployment: string; complexity: string };
  signals: string[]; entryPoints: EntryPoint[]; startersMd: string; referencesMd: string;
  language: Language; labels: Record<string, string>; createdAt: string;
}
export type BriefStreamEvent =
  | { type: "phase"; phase: BriefPhase }
  | { type: "done"; briefId: string; reusedFrom: string | null }
  | { type: "error"; message: string };

// session.ts
export class SessionExpiredError extends Error {}
export class ApiError extends Error { constructor(public status: number, message: string) }
export function isSignInResponse(res: Response): boolean   // redirected to /auth.html, or HTML where JSON was expected
export function goToSignIn(): void                          // window.location.assign("/auth.html")

// brief-api.ts
export function getMe(): Promise<Me>
export function listBriefs(): Promise<BriefSummary[]>
export function getBrief(id: string): Promise<BriefDetail>
export function deleteBrief(id: string): Promise<void>
export function pdfHref(id: string): string                 // `/api/brief/briefs/${id}/pdf`

// brief-stream.ts
export function parseFrames(buffer: string): { events: BriefStreamEvent[]; rest: string }
export function generateBrief(input: { company: string; language: Language }, onEvent, signal?): Promise<void>
export function refreshBrief(id: string, input: { language?: Language }, onEvent, signal?): Promise<void>
export const DROPPED_MESSAGE: string

// prefill.ts
export const MAX_COMPANY_CHARS = 100;
export function cleanCompany(raw: string | null | undefined): string   // same rule as briefparse.clean_company_prefill

// score.ts
export type FitTier = "strong" | "moderate" | "weak" | "none";
export function fitTier(score: number, max: 5 | 10): FitTier   // 5-scale: 4-5 strong, 3 moderate, 1-2 weak, 0 none; 10-scale: 8+ / 5-7 / 1-4 / null
export function fitLabel(tier: FitTier): string                // "Strong fit" | "Moderate fit" | "Weak fit" | "Not scored"

// relative-time.ts
export function relativeTime(iso: string, now?: Date): string  // "just now", "5 minutes ago", "2 days ago", then "Sep 12, 2026"
export function exactTime(iso: string): string
```

- [ ] **Step 1: Stream tests first** (`tests/brief-stream.test.ts`):

```ts
import { describe, expect, test, vi } from "vitest";
import { DROPPED_MESSAGE, generateBrief, parseFrames } from "@/lib/brief-stream";
import { ApiError, SessionExpiredError } from "@/lib/session";

const frame = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;

function streamResponse(chunks: string[], init: ResponseInit = {}) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" }, ...init });
}

describe("parseFrames", () => {
  test("parses complete frames and keeps the remainder", () => {
    const { events, rest } = parseFrames(frame({ type: "phase", phase: "init" }) + 'data: {"type":"ph');
    expect(events).toEqual([{ type: "phase", phase: "init" }]);
    expect(rest).toBe('data: {"type":"ph');
  });
  test("ignores heartbeats", () => {
    expect(parseFrames(": ping\n\n" + frame({ type: "phase", phase: "research" })).events)
      .toEqual([{ type: "phase", phase: "research" }]);
  });
  test("skips a frame that is not valid JSON", () => {
    expect(parseFrames("data: {nope\n\n").events).toEqual([]);
  });
});

describe("generateBrief", () => {
  test("reassembles frames split across chunks", async () => {
    const whole = frame({ type: "phase", phase: "init" }) + frame({ type: "done", briefId: "b1", reusedFrom: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse([whole.slice(0, 11), whole.slice(11, 40), whole.slice(40)])));
    const seen: unknown[] = [];
    await generateBrief({ company: "Acme", language: "en" }, (e) => seen.push(e));
    expect(seen).toEqual([{ type: "phase", phase: "init" }, { type: "done", briefId: "b1", reusedFrom: null }]);
  });
  test("posts JSON with credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse([frame({ type: "done", briefId: "b1", reusedFrom: null })]));
    vi.stubGlobal("fetch", fetchMock);
    await generateBrief({ company: "Acme", language: "es" }, () => {});
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/brief/briefs");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body)).toEqual({ company: "Acme", language: "es" });
  });
  test("reports a dropped connection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse([frame({ type: "phase", phase: "compose" })])));
    const seen: any[] = [];
    await generateBrief({ company: "Acme", language: "en" }, (e) => seen.push(e));
    expect(seen.at(-1)).toEqual({ type: "error", message: DROPPED_MESSAGE });
  });
  test("surfaces the envelope error for a refused request", async () => {
    const body = JSON.stringify({ success: false, data: null, error: "A brief is already being written for you." });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status: 409, headers: { "Content-Type": "application/json" } })));
    await expect(generateBrief({ company: "Acme", language: "en" }, () => {}))
      .rejects.toMatchObject({ status: 409, message: "A brief is already being written for you." } satisfies Partial<ApiError>);
  });
  test("treats the sign-in page as an expired session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 200, headers: { "Content-Type": "text/html" } })));
    await expect(generateBrief({ company: "Acme", language: "en" }, () => {})).rejects.toBeInstanceOf(SessionExpiredError);
  });
});
```

Run: FAIL (modules missing). Implement:

```ts
// lib/session.ts
export class SessionExpiredError extends Error {
  constructor() { super("Your session has expired. Please sign in again."); this.name = "SessionExpiredError"; }
}
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); this.name = "ApiError"; }
}
const SIGN_IN_PATH = "/auth.html";

/** nginx answers an expired session with a redirect to the sign-in page, which fetch follows. */
export function isSignInResponse(res: Response): boolean {
  if (res.redirected && res.url.includes(SIGN_IN_PATH)) return true;
  return (res.headers.get("Content-Type") ?? "").includes("text/html");
}
export function goToSignIn(): void {
  window.location.assign(SIGN_IN_PATH);
}
```

```ts
// lib/brief-stream.ts
import type { BriefStreamEvent, Language } from "./brief-types";
import { ApiError, SessionExpiredError, isSignInResponse } from "./session";

export const DROPPED_MESSAGE =
  "The connection dropped. Your brief may still finish. Check your briefs in a minute.";
const FALLBACK_ERROR = "Something went wrong. Please try again.";
const FRAME_END = "\n\n";
const DATA_PREFIX = "data: ";

export function parseFrames(buffer: string): { events: BriefStreamEvent[]; rest: string } {
  const parts = buffer.split(FRAME_END);
  const rest = parts.pop() ?? "";
  const events: BriefStreamEvent[] = [];
  for (const part of parts) {
    for (const line of part.split("\n")) {
      if (!line.startsWith(DATA_PREFIX)) continue; // heartbeats are comment lines
      try {
        events.push(JSON.parse(line.slice(DATA_PREFIX.length)) as BriefStreamEvent);
      } catch {
        // A malformed frame is dropped; the terminal-event check below still protects the UI.
      }
    }
  }
  return { events, rest };
}

async function errorFrom(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { error?: string };
    return new ApiError(res.status, body.error || FALLBACK_ERROR);
  } catch {
    return new ApiError(res.status, FALLBACK_ERROR);
  }
}

async function run(
  url: string, body: unknown, onEvent: (e: BriefStreamEvent) => void, signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST", credentials: "include", signal,
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (isSignInResponse(res)) throw new SessionExpiredError();
  if (!res.ok || !res.body) throw await errorFrom(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const parsed = parseFrames(buffer + decoder.decode(value, { stream: true }));
    buffer = parsed.rest;
    for (const event of parsed.events) {
      if (event.type === "done" || event.type === "error") finished = true;
      onEvent(event);
    }
  }
  if (!finished) onEvent({ type: "error", message: DROPPED_MESSAGE });
}

export function generateBrief(
  input: { company: string; language: Language }, onEvent: (e: BriefStreamEvent) => void, signal?: AbortSignal,
): Promise<void> {
  return run("/api/brief/briefs", input, onEvent, signal);
}

export function refreshBrief(
  id: string, input: { language?: Language }, onEvent: (e: BriefStreamEvent) => void, signal?: AbortSignal,
): Promise<void> {
  return run(`/api/brief/briefs/${encodeURIComponent(id)}/refresh`, input, onEvent, signal);
}
```

- [ ] **Step 2: API client tests then code.** Tests assert: `listBriefs` unwraps `data`; a `success:false` body throws `ApiError` with the envelope message and status; "treats a redirect to the sign-in page as an expired session" (HTML response rejects with `SessionExpiredError`); `deleteBrief` sends `DELETE` with credentials; `pdfHref("a b")` encodes the id. Implementation is one private `request<T>(path, init)` that applies `credentials: "include"`, runs `isSignInResponse`, parses the envelope and throws `ApiError` on `!res.ok || !body.success`.

- [ ] **Step 3: `cleanCompany`, `fitTier`, `relativeTime` tests then code.** `cleanCompany` cases mirror `tests/test_prefill.py` in CLEAR-brief-gen: `null` and `""` give `""`; `"  Acme \n Corp\t"` gives `"Acme Corp"`; control characters become spaces; 100 characters pass and 101 give `""`. `fitTier` covers each boundary on both scales. `relativeTime` takes an injected `now` and covers under a minute, minutes, hours, days up to 6, and the date form beyond.

- [ ] Commit: `feat: add the brief API client, stream reader and helpers`.

---

### Task 4: UI primitives

**Files:** `components/ui/*`, tests `tests/ui/*.test.tsx`

Each primitive is typed, token-only, keyboard-operable, and has a behaviour test.

| Primitive | Props | Behaviour and motion | Test |
|---|---|---|---|
| `Button` | `variant: "primary" \| "secondary" \| "ghost" \| "danger"`, `size`, `loading`, native button props | Press scales to 0.97; `loading` disables and shows a spinner without changing width | disabled while loading; fires `onClick` once |
| `TextField` | `label`, `hint`, `error`, input props | Visible label; error text linked with `aria-describedby` | label is associated; error is announced |
| `SegmentedControl<T>` | `options: {value: T; label: string}[]`, `value`, `onChange`, `label` | `role="radiogroup"`; arrow keys move; active pill slides on `SPRING_PILL` via `layoutId` | arrow keys change the value |
| `Pill` | `tone: "neutral" \| "accent" \| "positive" \| "warning" \| "negative"` | Tinted background, coloured text | renders tone class |
| `ScoreMeter` | `score: number \| null`, `max: 5 \| 10`, `size`, `animate` | A row of round-capped ticks; filled ticks take the tier colour and fill one by one (40ms apart) when `animate`; `aria-label` "Fit score 4 of 5, strong fit" | label text; filled tick count |
| `CountUp` | `value: number`, `decimals`, `durationMs = 600` | Counts on first view using `requestAnimationFrame`; jumps to the value under reduced motion; tabular numerals, fixed width | final value rendered; reduced motion renders it immediately |
| `Dialog` | `open`, `onOpenChange`, `title`, `description`, children | Radix dialog; scales in from 0.96, backdrop blur; exits in 150ms | focus moves in; Escape closes |
| `Toast` / `useToast` | `toast({ title, tone })` | Slides up, auto-dismisses after 4s, `aria-live="polite"` | message appears then leaves |
| `Skeleton` | `className` | Shimmer by a translating gradient; static under reduced motion | renders `aria-hidden` |
| `CopyButton` | `text`, `label` | Copies, swaps the icon for a tick for 1.5s, announces "Copied" | writes to clipboard mock |
| `Markdown` | `children: string`, `variant` | `react-markdown`, links open in a new tab with `rel="noopener noreferrer"`, only http(s) hrefs | "does not render raw HTML or unsafe links" |

- [ ] Build each with its test. Commit: `feat: add the shared UI primitives`.

---

### Task 5: Shell

**Files:** `components/shell/top-bar.tsx`, `tool-tabs.tsx`, `user-menu.tsx`, `app/layout.tsx`, `app/not-found.tsx`, `public/alkira-logo.svg`

- [ ] Top bar on the canvas: Alkira logo (links to `/`), tool tabs as a segmented pill ("Brief Generator" at `/` and `/briefs/*`, "Account Radar" at `/radar*`) with the sliding active pill, and the user menu (avatar initial, email, "Settings" to `/admin.html` for admins only, "Sign out" to `/api/auth/signout`). Sticky with a hairline border that appears after scrolling. A skip-to-content link.
- [ ] `getMe` through React Query; while loading the menu shows a skeleton; if it fails the menu shows only "Sign out". `SessionExpiredError` from any query calls `goToSignIn()` (global `QueryCache` `onError`).
- [ ] Page content mounts with the `rise` variant. Tab title set per page (`metadata`, and `document.title` on the brief page once the company is known).
- [ ] Not-found page: designed, with a link home.
- [ ] Tests: tabs mark the right one active for `/`, `/briefs/x`, `/radar`, `/radar/batch/y`; Settings is hidden for non-admins. Commit: `feat: add the shared shell`.

---

### Task 6: Brief Generator screens

**Files:** `app/page.tsx`, `app/briefs/[id]/page.tsx`, `components/brief/*`, tests `tests/brief/*.test.tsx`

**Home (`/`)**

- [ ] `GenerateBox` on the ambient surface (near-black, drifting blue glow built from a blurred, slowly translating layer): heading, company `TextField` with a visible label, language `SegmentedControl` (English / Español), Generate button. Reads `?company=` through `cleanCompany`, fills the field, removes the params with `router.replace`, never auto-submits. `/` focuses the field; Enter submits. Empty submit shows an inline error.
- [ ] On submit the box morphs (shared layout) into the progress view: the typed name as the title, `StepTracker` with four steps (Starting, Researching, Analyzing, Composing) whose connector draws with `scaleX`, a soft pulse on the active step, ticks on finished steps, a true one-line description per step ("Running 8 web searches", "Ranking results and reading the top pages", "Writing the brief"), and an elapsed timer in mono numerals.
- [ ] Outcomes: `done` invalidates the briefs query and navigates to `/briefs/<id>` (with `?reused=<date>` when `reusedFrom` is set); `error` returns to the form with the message and the typed name kept; `ApiError` 409, 429 and 503 show their envelope message; `SessionExpiredError` goes to sign-in.
- [ ] `StatsRow`: briefs generated, average fit, latest brief, as large `CountUp` numerals with muted labels. Hidden when there are no briefs.
- [ ] `Library`: search field and a sort pill (Newest / Highest fit), both mirrored in the URL (`?q=`, `?sort=`); tall rows with company, `ScoreMeter`, one-line snippet, relative date with the exact time in `title`, and a language pill for Spanish briefs. Rows stagger in on first load, lift on hover, and are whole-row links. Loading shows row skeletons; a failed load shows a retry; no briefs shows the three-step explainer; no search matches shows a clear-search action.

**Brief (`/briefs/[id]`)**

- [ ] `BriefHeader`, pinned on scroll: back link, company, stat pills split from `statsLine` on `|`, date, the reused-research badge when `?reused=` is present, and actions: Download PDF (a plain link to `pdfHref(id)`), Update brief, and Delete behind an overflow menu.
- [ ] Bento, arriving in a 40ms stagger: score tile (large `CountUp`, `ScoreMeter`, rationale) beside the four infrastructure tiles; signals; up to three entry-point tiles with Signal, Solution and Proof rows; conversation starters on the ambient surface, each with a `CopyButton`; references as a quiet footer. Tile labels come from `labels` so Spanish briefs read in Spanish.
- [ ] Sparse briefs: a tile with nothing to show is omitted, except score, which reads "Not scored". Test "renders a sparse brief without empty shells".
- [ ] Update brief swaps the bento for the progress view, then replaces the route with the new id. Delete opens the dialog ("Delete the brief for <company>? This cannot be undone."), removes the row from the cache optimistically, navigates home, toasts "Brief deleted", and restores the row with an error toast if the call fails.
- [ ] Loading shows a skeleton matching the bento; 404 shows the not-found state.
- [ ] Where `document.startViewTransition` exists and motion is allowed, the library row's company and score share `view-transition-name`s with the brief header. Time-boxed to one attempt; otherwise the standard page rise is the transition.
- [ ] Commit per screen: `feat: add the Brief Generator home`, `feat: add the brief page`.

---

### Task 7: Radar in the shell

**Files:** `components/radar/*` (moved from `components/`), `app/radar/page.tsx`, `app/radar/batch/[id]/*`, `lib/score-color.ts`

- [ ] Same shell and tokens. Input card with the account textarea (visible label, live unique count, existing validation and messages), results as tall rows: `ScoreMeter` at ten ticks with the mono numeral, tier pill (Hot / Warm / Skip), company and domain, three reasons, "Generate brief" as an internal link from `briefHref`, delete.
- [ ] Motion: pending rows shimmer; each result lands with its meter filling; when scoring finishes rows glide into score order on `SPRING_LAYOUT`; deleted rows collapse out.
- [ ] History: past batches as a rail on wide screens and a collapsible section on narrow ones.
- [ ] `score-color.ts` maps bands to tokens instead of raw `oklch` values; its tests are updated to the new mapping. All other radar lib tests pass unchanged.
- [ ] Commit: `feat: restyle the radar in the shared shell`.

---

### Task 8: Security headers

**Files:** `proxy.ts`, `app/layout.tsx`, test `tests/csp.test.ts`

- [ ] `buildCsp(nonce: string, isDev: boolean): string` is a pure function under test: `default-src 'self'`; `script-src 'self' 'nonce-<nonce>' 'strict-dynamic'` (plus `'unsafe-eval'` in dev only); `style-src 'self' 'unsafe-inline'`; `img-src 'self' data: blob:`; `font-src 'self'`; `connect-src 'self'`; `frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'`; `object-src 'none'`.
- [ ] `proxy.ts` (Next 16's name for middleware) generates the nonce per request, sets the CSP plus `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and skips static assets.
- [ ] Verify in the browser console that no CSP violation is reported on any screen, including during generation. Commit: `feat: add a nonce-based content security policy`.

---

### Task 9: End-to-end, accessibility, visual and budget checks

**Files:** `playwright.config.ts`, `tests/e2e/*.spec.ts`

- [ ] Playwright starts the mock API (`MOCK_SPEED=0.02`) and the built app, sets `X-Auth-Email` as today.
- [ ] Flows: generate a brief and land on its page; the prefill handoff from a radar row; open a brief from the library; search and sort survive going into a brief and back; delete with confirmation; update a brief; Spanish labels; `fail`, `drop` and `busy` companies show their messages; the radar flow and the 41-account error (existing assertions, new paths); keyboard-only generate and delete.
- [ ] `@axe-core/playwright` on home, brief and radar: no serious or critical violations.
- [ ] Screenshots of home, generating, brief and radar at 320, 768, 1024 and 1440; no horizontal scroll at any width.
- [ ] Reduced motion (`reducedMotion: "reduce"`): generate still completes and counts show final values immediately.
- [ ] `npm run build`: every app route under 300kb gzipped first-load JS.
- [ ] Commit: `test: cover the shared front end end to end`.

## Done when

- `npm test`, `npm run e2e` and `npm run build` pass in `web/`.
- Every feature in spec section 2 works against the mock API, and the look has been accepted from screenshots.
- No `basePath`, no `NEXT_PUBLIC_BRIEFGEN_URL`, no raw colour values in components.
- Branch `feature/shared-frontend` is not pushed.
