# Alkira Account Radar — Design

**Date:** 2026-05-18
**Status:** Approved by user, ready for implementation plan
**Sibling project:** [alkirapartners/CLEAR-brief-gen](https://github.com/alkirapartners/CLEAR-brief-gen) (the existing per-company brief generator this tool complements)

---

## 1. Purpose

A partner-facing web tool that scores 1–40 accounts at a time for Alkira fit. A partner pastes a list of company names (comma, newline, or tab separated), and a Claude Managed Agent researches each one and returns a 1–10 fit score plus three structured bullets:

- **Fit** — strongest reason this account is a fit
- **Objection** — most likely objection or risk
- **Action** — recommended use-case angle to lead with

Results stream into the UI row-by-row as each agent finishes. The partner can sort, export, and click any row to deep-link into the existing brief-gen tool for a full opportunity brief.

## 2. Why This Tool Exists

Partners often work pipelines of 10–30 accounts. CLEAR-brief-gen answers "tell me about this one company" deeply but is one-at-a-time. Partners need a way to prioritize: which of their 20 accounts deserve the deep brief and which are skip-worthy. Account Radar is the triage step before brief-gen, and hands off cleanly to it.

## 3. Architecture

```
Browser (Next.js, radar.partners.alkira.cc)
  │
  └─► nginx
        │
        ├─► /auth.html, /admin.html ──► static files (shared with brief-gen)
        │
        ├─► /api/auth/*  ──► briefgen-proxy.js (Node, shared with brief-gen)
        │                     magic links, sessions, trusted domains
        │
        ├─► /  (Next.js, port 3000)  ──► reads X-Auth-Email from nginx
        │      input form, results table, batch history sidebar
        │
        └─► /api/radar/*  ──► FastAPI (Python, port 8601)
                               POST /run        → starts batch, returns run_id
                               GET  /run/:id    → SSE: row-by-row results
                               GET  /history    → past batches for this partner
                               GET  /batch/:id  → one batch's full results
```

**Auth backend is shared with brief-gen.** No new magic-link infrastructure. Partners sign in once and work in both tools. nginx routes `radar.partners.alkira.cc` to this new app while continuing to serve `briefgen.partners.alkira.cc`.

**Agent orchestration (inside FastAPI):**

```
POST /run  receives  ["Acme", "Globex", ...up to 40 names]
  │
  ├─ parse + dedupe input
  ├─ insert batch row in Supabase, return run_id
  └─ kick off asyncio background task: RadarOrchestrator
        │
        └─ asyncio.Semaphore(8) → for each account:
              run = await anthropic.beta.agents.runs.create(
                  agent_id=ALKIRA_RADAR_AGENT_ID,
                  environment_id=ALKIRA_RADAR_ENV_ID,
                  input=account_name,
              )
              parse JSON output (score, fit, objection, action,
                                 resolved_name, resolved_domain, sources)
              update account_result row in Supabase
              push event onto SSE queue
```

The orchestrator runs detached from the HTTP request. Each batch has its own asyncio queue; SSE handlers subscribe to that queue keyed by `run_id`. If the partner closes their tab and reopens it, the frontend re-subscribes to the same `run_id` queue (if still running) or loads completed rows from Supabase (if already done).

## 4. Data Model

Two new Supabase tables in the existing project (separate from brief-gen's tables). RLS enabled, scoped by `partner_email` from the auth-proxy-issued JWT.

```sql
create table radar_batches (
  id uuid primary key default gen_random_uuid(),
  partner_email text not null,
  input_raw text not null,
  input_count int not null,
  unique_count int not null,
  status text not null default 'running' check (status in ('running','done','error')),
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table radar_results (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references radar_batches(id) on delete cascade,
  account_name text not null,
  resolved_name text,
  resolved_domain text,
  score int check (score between 1 and 10),
  fit_bullet text,
  objection_bullet text,
  action_bullet text,
  sources jsonb,
  agent_run_id text,
  status text not null default 'pending' check (status in ('pending','done','error')),
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index on radar_batches (partner_email, created_at desc);
create index on radar_results (batch_id);

alter table radar_batches enable row level security;
alter table radar_results enable row level security;

create policy radar_batches_select on radar_batches for select
  using (partner_email = current_setting('request.jwt.claims', true)::json->>'email');
create policy radar_batches_insert on radar_batches for insert
  with check (partner_email = current_setting('request.jwt.claims', true)::json->>'email');

create policy radar_results_select on radar_results for select
  using (exists (
    select 1 from radar_batches b
    where b.id = radar_results.batch_id
      and b.partner_email = current_setting('request.jwt.claims', true)::json->>'email'
  ));
create policy radar_results_insert on radar_results for insert
  with check (exists (
    select 1 from radar_batches b
    where b.id = radar_results.batch_id
      and b.partner_email = current_setting('request.jwt.claims', true)::json->>'email'
  ));
```

The FastAPI server uses the Supabase service-role key and sets the `request.jwt.claims` session variable per query so RLS still enforces partner scoping inside Postgres.

## 5. Agent + Skills

**One managed agent definition.** Each account is one independent agent run, fired in parallel up to concurrency 8.

```python
client.beta.agents.create(
    name="Alkira Account Radar Scorer",
    description="Scores a single account 1-10 for Alkira fit and produces fit/objection/action bullets.",
    model="claude-sonnet-4-6",
    system=ALKIRA_RADAR_SYSTEM_PROMPT,
    tools=[{"type": "agent_toolset_20260401", "configs": [
        {"name": "web_search", "enabled": True},
        {"name": "write", "enabled": False},
        {"name": "edit", "enabled": False},
    ]}],
    skills=[
        {"type": "custom", "skill_id": ALKIRA_CUSTOMER_SKILL_ID, "version": "latest"},
        {"type": "custom", "skill_id": ALKIRA_RADAR_RUBRIC_SKILL_ID, "version": "latest"},
        {"type": "custom", "skill_id": STOP_SLOP_SKILL_ID, "version": "latest"},
    ],
)
```

**Skills:**

- `alkira-customer` — **reused from brief-gen.** Encodes Alkira fit criteria, ICP, use cases, competitive landscape.
- `alkira-radar-rubric` — **new for this tool.** Encodes the 1–10 scoring rubric and the strict JSON output schema. See section 6.
- `stop-slop` — **reused.** Keeps the three bullets specific, non-generic, and free of AI-tell patterns.

The system prompt enforces:
- Output exactly one JSON object matching the schema (no prose, no markdown)
- Research a single company only — do not browse competitors unless directly relevant to an objection
- If the name is ambiguous (e.g., "Acme"), pick the largest US-headquartered match and state that assumption in the fit bullet
- Never invent facts; if no public information is found, return `status: "not_found"` and skip score/bullets
- Cite 2–4 source URLs the agent actually used in `sources`

## 6. Scoring Rubric (encoded in `alkira-radar-rubric` skill)

| Score | Meaning | Action implication |
|---|---|---|
| 10 | Active trigger event + clear use case + open buying window | Drop everything, run a brief, reach out this week |
| 8–9 | Strong fit, clear use case, no major blocker | Brief and outreach within 2 weeks |
| 5–7 | Plausible fit, needs more discovery | Worth a discovery call, not a cold pitch |
| 3–4 | Weak fit, would need a hook to justify time | Park, revisit in a quarter |
| 1–2 | Wrong size, wrong vertical, or actively hostile to Alkira | Skip |

The rubric maps approximately to brief-gen's 1–5 fit score as: `radar_score ≈ 2 × briefgen_score` (a brief-gen 4 ≈ radar 8). This is documented in the skill so partners using both tools see consistent signal.

## 7. Output Contract

Every agent run returns exactly one JSON object:

```json
{
  "resolved_name": "Acme Corporation",
  "resolved_domain": "acme.com",
  "score": 8,
  "fit_bullet": "Recently announced multi-cloud strategy across AWS and Azure with 40+ VPCs; their July earnings call flagged 'network sprawl' as a top cost driver.",
  "objection_bullet": "They just signed a 3-year Aviatrix contract in March — expect 'we already solved this' as the first response.",
  "action_bullet": "Lead with backbone-as-a-service angle for their EMEA expansion (announced Q2), not core multicloud which is locked in.",
  "sources": ["https://acme.com/press/q2-earnings", "https://...", "..."]
}
```

If no information is found:

```json
{
  "resolved_name": null,
  "resolved_domain": null,
  "score": null,
  "status": "not_found",
  "error_message": "No public information found for 'XYZ Holdings'. Try adding a domain.",
  "sources": []
}
```

FastAPI validates this shape with a Pydantic model before persisting and emitting SSE. Malformed agent output triggers one retry; second failure marks the row `error`.

## 8. User Flow

1. Partner visits `radar.partners.alkira.cc`. If no session, nginx redirects to `/auth.html` (shared with brief-gen). After magic-link sign-in, returns to `/`.
2. Empty state: a `<textarea>` and a "Score Accounts" button. Sidebar lists past batches: "Acme + 19 more — May 14".
3. Partner pastes input. Parser splits on newline, comma, or tab; trims whitespace; dedupes case-insensitively; drops empties.
4. Validations on submit:
   - 0 accounts after parsing → "Add at least one account name."
   - More than 40 unique accounts → hard block: "Please split into batches of 40 or fewer."
   - Partner has already run 5 batches today → soft block with admin-override path: "Daily limit reached. Contact your admin to increase."
5. Frontend calls `POST /api/radar/run`. Backend inserts the batch row, returns `{run_id}`. Frontend opens SSE to `GET /api/radar/run/{run_id}`.
6. Results table renders one row per account in `pending` state. As each agent finishes, an SSE event lands and the corresponding row updates in place: score badge, three bullets expand, "Generate full brief" button enables.
7. When all rows reach `done` or `error`, the table auto-sorts by score descending (one-time, partner can re-sort). Header shows summary: "20 of 20 scored — 4 hot (8+), 9 warm (5–7), 7 skip (1–4)."
8. "Export CSV" downloads `account, resolved_name, resolved_domain, score, fit, objection, action, sources_joined`. "Share batch" copies a read-only URL (`/batch/{batch_id}`) the partner can send to a colleague on the same trusted domain.
9. "Generate full brief" on any row redirects to `briefgen.partners.alkira.cc/?company={resolved_name}&domain={resolved_domain}`. **Brief-gen requires a small change to accept these query params and prefill its form** — tracked as a sibling issue in that repo.

## 9. Edge Cases

| Case | Behavior |
|---|---|
| Ambiguous name | Agent picks largest US-HQ match, notes assumption in `fit_bullet` ("Assumed Acme Corp, Austin, ~$200M revenue") |
| Company not found | Row status `error`, message "No public information found — try adding a domain" |
| Agent API error or timeout | One retry with 5s backoff. If still failing, row `error`, other rows continue |
| Malformed JSON from agent | One retry. Second failure → row `error`, log full output for debugging |
| Partner closes tab mid-run | Orchestrator continues. On revisit, sidebar shows batch as `running`; frontend re-subscribes to SSE if still running, otherwise loads completed rows from Supabase |
| Duplicate account in input | Dedupe at parse time, case-insensitive. UI shows "20 entered, 18 unique" |
| Input >40 unique accounts | Hard block at parse time |
| Partner from non-trusted domain | Blocked at nginx by briefgen-proxy.js (existing behavior) |
| Concurrency cap hit | Semaphore queues remaining work. Per-batch wall time stays ≤2 min for 40 accounts |
| Supabase outage | Backend still runs the agent and pushes SSE events. Persistence retried; if it fails permanently, row marked `error` after batch completes. The partner still sees results live |

## 10. Cost Guardrails

- Model: **claude-sonnet-4-6**. Haiku was considered but underperformed on ambiguous-name disambiguation.
- Per-account cost target: $0.15–0.30 (1–2 web searches + ~2K output tokens).
- 40-account batch ≈ $6–12.
- Hard cap: **40 accounts per batch** (enforced server-side).
- Soft cap: **5 batches per partner per day** (configurable per-partner override via the existing admin panel — adds one new endpoint).
- Concurrency cap: **8 parallel agent runs** per batch.

## 11. Deployment

Reuse the brief-gen droplet. Add:

```
/etc/nginx/sites-available/radar.partners.alkira.cc
  server {
    server_name radar.partners.alkira.cc;
    auth_request /auth-check;
    location /auth-check { internal; proxy_pass http://localhost:3461/check; }
    location /auth.html { root /var/www/briefgen; }   # shared
    location /admin.html { root /var/www/briefgen; }  # shared
    location /api/auth/ { proxy_pass http://localhost:3461; }
    location /api/radar/ { proxy_pass http://localhost:8601; }
    location / { proxy_pass http://localhost:3000; }  # next.js
  }
```

`systemd` units:

- `radar-web.service` — `next start` on port 3000
- `radar-api.service` — `uvicorn radar.api:app --port 8601 --workers 1` (single worker because the asyncio orchestrator holds in-process queues; horizontal scaling later requires moving queues to Redis)

`docker-compose.yml` adds two services alongside brief-gen.

**Header trust:** FastAPI binds to `127.0.0.1:8601` only. nginx strips any incoming `X-Auth-Email` from the client and sets it from the auth-proxy result before forwarding. Clients cannot reach FastAPI directly or spoof the header.

Same Supabase project, two new tables (migration file in `supabase/migrations/`). New env vars:

```
ALKIRA_RADAR_AGENT_ID=...
ALKIRA_RADAR_ENV_ID=...
ALKIRA_CUSTOMER_SKILL_ID=...        # shared
ALKIRA_RADAR_RUBRIC_SKILL_ID=...    # new
STOP_SLOP_SKILL_ID=...              # shared
SUPABASE_URL=...                     # shared
SUPABASE_SERVICE_ROLE_KEY=...        # shared
ANTHROPIC_API_KEY=...                # shared
RADAR_DAILY_BATCH_LIMIT=5
RADAR_MAX_BATCH_SIZE=40
RADAR_AGENT_CONCURRENCY=8
```

## 12. Repo Layout

```
alkira-account-list/
├── web/                          # Next.js app
│   ├── app/
│   │   ├── page.tsx              # input + results
│   │   ├── batch/[id]/page.tsx   # historical batch view
│   │   └── api/                  # thin proxy/types only
│   ├── components/
│   │   ├── input-form/
│   │   ├── results-table/
│   │   └── history-sidebar/
│   ├── lib/
│   │   ├── parse-input.ts        # mirrors Python parser, tested separately
│   │   ├── sse-client.ts
│   │   └── score-color.ts
│   └── styles/
├── api/                          # FastAPI app
│   ├── radar/
│   │   ├── api.py                # FastAPI routes
│   │   ├── orchestrator.py       # asyncio batch runner
│   │   ├── agent_client.py       # Anthropic SDK wrapper
│   │   ├── parser.py             # input parser, deduper
│   │   ├── schemas.py            # Pydantic models
│   │   ├── db.py                 # Supabase queries
│   │   └── sse.py                # event bus + SSE encoder
│   ├── system_prompt.py
│   ├── setup_agent.py            # one-time: create managed agent
│   ├── setup_skills.py           # one-time: upload alkira-radar-rubric
│   ├── tests/
│   └── requirements.txt
├── skills/
│   └── alkira-radar-rubric/      # new skill source
├── supabase/
│   └── migrations/
│       └── 20260518_radar_tables.sql
├── docker-compose.yml
├── deploy/
│   └── nginx/radar.partners.alkira.cc.conf
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-05-18-alkira-account-radar-design.md  (this file)
```

## 13. Testing Strategy

Meet the 80% coverage requirement from the global testing rules.

**Python (`api/radar/`):**

- Unit:
  - `parser.py` — comma/newline/tab inputs, dedupe (case-insensitive), trim, empty filtering, max size enforcement
  - `schemas.py` — Pydantic validation of agent output (happy path, malformed, `not_found` path)
  - `sse.py` — event serialization
- Integration:
  - `POST /api/radar/run` end-to-end against a fake Anthropic client that returns canned responses; verify rows land in Supabase and SSE events emit in the correct order
  - Resubscription: open SSE, close, reopen — verify no events lost for completed rows
- Fault injection:
  - One agent run raises → other rows complete, failing row marked `error`
  - Malformed JSON from agent → retry once, then error
  - Supabase write fails → agent still completes, error logged, row marked `error` post-batch

**Frontend (`web/`):**

- Unit (Vitest):
  - `parse-input.ts` — mirror of Python parser cases (this is the cross-language safety net)
  - `score-color.ts` — score → color band mapping
- E2E (Playwright):
  - Sign-in flow (mocked nginx)
  - Submit 5 accounts against a mocked FastAPI SSE; rows stream in; verify final sort order and summary header
  - Click "Generate full brief" and assert redirect URL shape
  - 41-account input → blocked with friendly error
- Visual regression: results table at 320 / 768 / 1440 (per web testing rules)
- Accessibility: keyboard navigation through results, score badges have aria-labels

## 14. Out of Scope

These are explicitly deferred to future iterations:

- Multi-tenant org structure (partners remain individual users, same as brief-gen)
- Re-scoring an existing batch in place (partner runs a fresh batch instead)
- Persistent agent memory across batches (each run is independent)
- Slack or email notifications when a batch completes (partners stay on the page; async notification is the next iteration if needed)
- Bulk CSV upload (textarea paste covers the 1–40 account use case; CSV upload is the natural next step if usage grows)
- Cross-batch deduplication / "you scored Acme last week, here's that result" suggestions
- Partner-configurable scoring weights

## 15. Open Brief-Gen Coordination

This design assumes one small change to brief-gen: accept `?company=...&domain=...` query params on its main page and prefill the form. That work lives in the brief-gen repo and should be tracked as a sibling issue, not part of this implementation plan. Radar can ship without this — the "Generate full brief" button would simply land partners on brief-gen's empty form until that change merges.

## 16. Success Criteria

This tool is working when:

- A partner can paste 20 names and see all 20 scored within 60 seconds
- Each row has a score (1–10) and three useful, specific, non-generic bullets
- The "Generate full brief" handoff lands the partner on a brief-gen page with the company prefilled
- Past batches survive page reloads and are reachable via the sidebar
- A partner from an untrusted domain cannot reach any radar endpoint
- The 40-account hard cap and 5-batch daily soft cap are enforced
- 80%+ test coverage across both `api/` and `web/`
