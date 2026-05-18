# Alkira Account Radar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a partner-facing tool that scores up to 40 accounts at a time for Alkira fit, with streaming results, shared magic-link auth, Supabase persistence, and handoff to the existing CLEAR-brief-gen tool.

**Architecture:** Next.js frontend at `radar.partners.alkira.cc` calls a FastAPI backend that orchestrates parallel Claude Managed Agent runs (concurrency 8) and streams row-by-row results via SSE. Two new Supabase tables persist batches + per-account results with RLS scoped by partner email. The existing `briefgen-proxy.js` handles magic-link auth for both tools.

**Tech Stack:** Next.js 16 + TypeScript + Tailwind, FastAPI + asyncio + Pydantic, Anthropic Python SDK (managed agents beta), Supabase Postgres, nginx + systemd, Playwright + pytest + Vitest.

**Spec reference:** `docs/superpowers/specs/2026-05-18-alkira-account-radar-design.md`

---

## File Structure

```
alkira-account-list/
├── api/
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── radar/
│   │   ├── __init__.py
│   │   ├── api.py                # FastAPI app + routes
│   │   ├── orchestrator.py       # asyncio batch runner with semaphore
│   │   ├── agent_client.py       # Anthropic managed-agent wrapper
│   │   ├── parser.py             # input text → list[str]
│   │   ├── schemas.py            # Pydantic models
│   │   ├── db.py                 # Supabase queries
│   │   ├── sse.py                # event bus + SSE encoder
│   │   ├── auth.py               # X-Auth-Email header extraction
│   │   ├── system_prompt.py
│   │   ├── setup_skills.py
│   │   └── setup_agent.py
│   └── tests/
│       ├── conftest.py
│       ├── test_parser.py
│       ├── test_schemas.py
│       ├── test_sse.py
│       ├── test_agent_client.py
│       ├── test_db.py
│       ├── test_orchestrator.py
│       └── test_api.py
├── web/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   ├── playwright.config.ts
│   ├── vitest.config.ts
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── page.tsx              # main: input + streaming results
│   │   └── batch/[id]/page.tsx   # historical batch view
│   ├── components/
│   │   ├── input-form.tsx
│   │   ├── results-table.tsx
│   │   ├── result-row.tsx
│   │   ├── history-sidebar.tsx
│   │   └── score-badge.tsx
│   ├── lib/
│   │   ├── parse-input.ts        # MUST mirror Python parser behavior
│   │   ├── sse-client.ts
│   │   ├── score-color.ts
│   │   ├── types.ts              # shared types
│   │   └── api-client.ts
│   └── tests/
│       ├── parse-input.test.ts
│       ├── score-color.test.ts
│       ├── sse-client.test.ts
│       └── e2e/
│           └── flow.spec.ts
├── skills/
│   └── alkira-radar-rubric/
│       └── SKILL.md
├── supabase/
│   └── migrations/
│       └── 20260518_radar_tables.sql
├── deploy/
│   ├── nginx/radar.partners.alkira.cc.conf
│   ├── systemd/radar-api.service
│   └── systemd/radar-web.service
├── docker-compose.yml
├── .env.example
├── README.md
└── SETUP.md
```

Each file has one responsibility. The Python parser and TypeScript parser must produce identical output for the same input — enforced by mirrored test cases (Task 4 + Task 18).

---

## Phase 1 — Foundation

### Task 1: Root README and `.env.example`

**Files:**
- Create: `README.md`
- Create: `.env.example`

- [ ] **Step 1: Write `README.md`**

```markdown
# Alkira Account Radar

Partner-facing tool that scores up to 40 accounts at a time for Alkira fit. Sibling to [CLEAR-brief-gen](https://github.com/alkirapartners/CLEAR-brief-gen).

## Layout

- `api/` — FastAPI backend + Claude Managed Agent orchestration
- `web/` — Next.js frontend
- `skills/` — Source for the `alkira-radar-rubric` Claude skill
- `supabase/` — Database migrations
- `deploy/` — nginx + systemd configs
- `docs/` — Design specs and implementation plans

## Setup

See `SETUP.md`.
```

- [ ] **Step 2: Write `.env.example`**

```
ANTHROPIC_API_KEY=sk-ant-REPLACE

ALKIRA_RADAR_AGENT_ID=
ALKIRA_RADAR_ENV_ID=

ALKIRA_CUSTOMER_SKILL_ID=
ALKIRA_RADAR_RUBRIC_SKILL_ID=
STOP_SLOP_SKILL_ID=

SUPABASE_URL=https://REPLACE.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_REPLACE

RADAR_DAILY_BATCH_LIMIT=5
RADAR_MAX_BATCH_SIZE=40
RADAR_AGENT_CONCURRENCY=8

NEXT_PUBLIC_BRIEFGEN_URL=https://briefgen.partners.alkira.cc
NEXT_PUBLIC_API_BASE=/api/radar
```

- [ ] **Step 3: Commit**

```bash
git add README.md .env.example
git commit -m "chore: add root README and env example"
```

---

### Task 2: Supabase migration

**Files:**
- Create: `supabase/migrations/20260518_radar_tables.sql`

- [ ] **Step 1: Write the migration**

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

create index radar_batches_partner_created_idx
  on radar_batches (partner_email, created_at desc);
create index radar_results_batch_idx
  on radar_results (batch_id);

alter table radar_batches enable row level security;
alter table radar_results enable row level security;

create policy radar_batches_select on radar_batches for select
  using (partner_email = current_setting('request.jwt.claims', true)::json->>'email');
create policy radar_batches_insert on radar_batches for insert
  with check (partner_email = current_setting('request.jwt.claims', true)::json->>'email');
create policy radar_batches_update on radar_batches for update
  using (partner_email = current_setting('request.jwt.claims', true)::json->>'email');

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
create policy radar_results_update on radar_results for update
  using (exists (
    select 1 from radar_batches b
    where b.id = radar_results.batch_id
      and b.partner_email = current_setting('request.jwt.claims', true)::json->>'email'
  ));
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260518_radar_tables.sql
git commit -m "feat(db): add radar_batches and radar_results migrations with RLS"
```

Migration is applied later against the shared Supabase project in Task 32 setup.

---

### Task 3: Python scaffolding

**Files:**
- Create: `api/requirements.txt`
- Create: `api/pyproject.toml`
- Create: `api/radar/__init__.py`
- Create: `api/tests/__init__.py`
- Create: `api/tests/conftest.py`

- [ ] **Step 1: `api/requirements.txt`**

```
anthropic>=0.52.0
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
pydantic>=2.9.0
python-dotenv>=1.0.0
supabase==2.18.0
httpx>=0.27.0
sse-starlette>=2.1.3
pytest>=8.3
pytest-asyncio>=0.24
pytest-cov>=5.0
```

- [ ] **Step 2: `api/pyproject.toml`**

```toml
[project]
name = "alkira-radar-api"
version = "0.1.0"
requires-python = ">=3.11"

[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
asyncio_mode = "auto"

[tool.ruff]
line-length = 100
```

- [ ] **Step 3: Empty package files**

```bash
mkdir -p api/radar api/tests
touch api/radar/__init__.py api/tests/__init__.py
```

- [ ] **Step 4: `api/tests/conftest.py`**

```python
import os
import pytest

os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")
os.environ.setdefault("ALKIRA_RADAR_AGENT_ID", "agent_test")
os.environ.setdefault("ALKIRA_RADAR_ENV_ID", "env_test")
os.environ.setdefault("RADAR_DAILY_BATCH_LIMIT", "5")
os.environ.setdefault("RADAR_MAX_BATCH_SIZE", "40")
os.environ.setdefault("RADAR_AGENT_CONCURRENCY", "8")


@pytest.fixture
def partner_email():
    return "partner@example.com"
```

- [ ] **Step 5: Verify**

```bash
cd api && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest --collect-only
```

Expected: collects zero tests with no import errors.

- [ ] **Step 6: Commit**

```bash
git add api/
git commit -m "chore(api): scaffold Python project with FastAPI + pytest"
```

---

## Phase 2 — Backend Core (TDD)

### Task 4: Input parser

**Files:**
- Create: `api/radar/parser.py`
- Create: `api/tests/test_parser.py`

- [ ] **Step 1: Write the failing tests**

`api/tests/test_parser.py`:

```python
import pytest
from radar.parser import parse_accounts, ParseError


def test_splits_on_newline():
    parsed, unique = parse_accounts("Acme\nGlobex\nInitech")
    assert parsed == ["Acme", "Globex", "Initech"]
    assert unique == 3


def test_splits_on_comma():
    parsed, _ = parse_accounts("Acme, Globex, Initech")
    assert parsed == ["Acme", "Globex", "Initech"]


def test_splits_on_tab():
    parsed, _ = parse_accounts("Acme\tGlobex\tInitech")
    assert parsed == ["Acme", "Globex", "Initech"]


def test_mixed_delimiters():
    parsed, _ = parse_accounts("Acme, Globex\nInitech\tWayne")
    assert parsed == ["Acme", "Globex", "Initech", "Wayne"]


def test_trims_whitespace():
    parsed, _ = parse_accounts("  Acme   ,  Globex  ")
    assert parsed == ["Acme", "Globex"]


def test_drops_empties():
    parsed, _ = parse_accounts("Acme,, ,\n\nGlobex")
    assert parsed == ["Acme", "Globex"]


def test_dedupes_case_insensitive_preserves_first_casing():
    parsed, unique = parse_accounts("Acme\nacme\nACME\nGlobex")
    assert parsed == ["Acme", "Globex"]
    assert unique == 2


def test_empty_input_raises():
    with pytest.raises(ParseError, match="Add at least one account"):
        parse_accounts("")


def test_only_whitespace_raises():
    with pytest.raises(ParseError, match="Add at least one account"):
        parse_accounts("   \n\t,,")


def test_max_size_enforced():
    raw = "\n".join(f"Co{i}" for i in range(41))
    with pytest.raises(ParseError, match="40 or fewer"):
        parse_accounts(raw, max_size=40)


def test_max_size_after_dedupe_allows_40_unique():
    lines = [f"Co{i}" for i in range(40)] + ["Co0"]
    parsed, unique = parse_accounts("\n".join(lines), max_size=40)
    assert unique == 40
    assert len(parsed) == 40
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd api && pytest tests/test_parser.py -v
```

Expected: all fail with `ModuleNotFoundError`.

- [ ] **Step 3: Implement the parser**

`api/radar/parser.py`:

```python
import re


class ParseError(ValueError):
    pass


_DELIMITERS = re.compile(r"[,\n\r\t]+")


def parse_accounts(raw: str, max_size: int = 40) -> tuple[list[str], int]:
    """Parse a textarea blob into a deduped list of account names.

    Splits on comma, newline, or tab; trims whitespace; drops empties;
    dedupes case-insensitively while preserving the first-seen casing.

    Returns (accounts, unique_count). Raises ParseError if the result is
    empty or exceeds max_size.
    """
    candidates = (s.strip() for s in _DELIMITERS.split(raw))
    candidates = (s for s in candidates if s)

    seen_lower: set[str] = set()
    accounts: list[str] = []
    for name in candidates:
        key = name.lower()
        if key in seen_lower:
            continue
        seen_lower.add(key)
        accounts.append(name)

    if not accounts:
        raise ParseError("Add at least one account name.")

    if len(accounts) > max_size:
        raise ParseError(
            f"Please split into batches of {max_size} or fewer "
            f"(you entered {len(accounts)} unique accounts)."
        )

    return accounts, len(accounts)
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pytest tests/test_parser.py -v
```

- [ ] **Step 5: Commit**

```bash
git add api/radar/parser.py api/tests/test_parser.py
git commit -m "feat(api): add input parser with dedupe and size cap"
```

---

### Task 5: Pydantic schemas

**Files:**
- Create: `api/radar/schemas.py`
- Create: `api/tests/test_schemas.py`

- [ ] **Step 1: Failing tests**

`api/tests/test_schemas.py`:

```python
import pytest
from pydantic import ValidationError
from radar.schemas import AgentOutput, BatchCreateRequest, SSEEvent


def test_agent_output_happy_path():
    out = AgentOutput.model_validate({
        "resolved_name": "Acme Corp",
        "resolved_domain": "acme.com",
        "score": 8,
        "fit_bullet": "Strong multicloud signal.",
        "objection_bullet": "Recent Aviatrix contract.",
        "action_bullet": "Lead with EMEA backbone angle.",
        "sources": ["https://acme.com/press"],
    })
    assert out.score == 8
    assert out.status == "ok"


def test_agent_output_not_found():
    out = AgentOutput.model_validate({
        "resolved_name": None,
        "resolved_domain": None,
        "score": None,
        "status": "not_found",
        "error_message": "No public information found.",
        "sources": [],
    })
    assert out.status == "not_found"
    assert out.score is None


def test_agent_output_score_out_of_range():
    with pytest.raises(ValidationError):
        AgentOutput.model_validate({
            "resolved_name": "Acme",
            "resolved_domain": "acme.com",
            "score": 11,
            "fit_bullet": "x",
            "objection_bullet": "x",
            "action_bullet": "x",
            "sources": [],
        })


def test_agent_output_ok_requires_bullets():
    with pytest.raises(ValidationError):
        AgentOutput.model_validate({
            "resolved_name": "Acme",
            "resolved_domain": "acme.com",
            "score": 8,
            "sources": [],
        })


def test_batch_create_request():
    req = BatchCreateRequest(raw="Acme\nGlobex")
    assert req.raw == "Acme\nGlobex"


def test_sse_event_payload():
    ev = SSEEvent(
        type="result",
        batch_id="11111111-1111-1111-1111-111111111111",
        index=0,
        row={"account_name": "Acme", "status": "done", "score": 8},
    )
    payload = ev.to_sse_payload()
    assert payload.startswith("data: ")
    assert payload.endswith("\n\n")
    assert '"type": "result"' in payload
```

- [ ] **Step 2: Run — expect failure**

```bash
pytest tests/test_schemas.py -v
```

- [ ] **Step 3: Implement**

`api/radar/schemas.py`:

```python
from __future__ import annotations
import json
from typing import Literal, Optional
from pydantic import BaseModel, Field, model_validator


class AgentOutput(BaseModel):
    resolved_name: Optional[str] = None
    resolved_domain: Optional[str] = None
    score: Optional[int] = Field(default=None, ge=1, le=10)
    fit_bullet: Optional[str] = None
    objection_bullet: Optional[str] = None
    action_bullet: Optional[str] = None
    sources: list[str] = Field(default_factory=list)
    status: Literal["ok", "not_found"] = "ok"
    error_message: Optional[str] = None

    @model_validator(mode="after")
    def _check_consistency(self) -> "AgentOutput":
        if self.status == "ok":
            missing = [
                f for f in ("fit_bullet", "objection_bullet", "action_bullet", "score")
                if getattr(self, f) in (None, "")
            ]
            if missing:
                raise ValueError(
                    f"AgentOutput with status=ok missing required fields: {missing}"
                )
        return self


class BatchCreateRequest(BaseModel):
    raw: str = Field(min_length=1, max_length=20_000)


class ResultRow(BaseModel):
    id: str
    account_name: str
    resolved_name: Optional[str] = None
    resolved_domain: Optional[str] = None
    score: Optional[int] = None
    fit_bullet: Optional[str] = None
    objection_bullet: Optional[str] = None
    action_bullet: Optional[str] = None
    sources: list[str] = Field(default_factory=list)
    status: Literal["pending", "done", "error"] = "pending"
    error_message: Optional[str] = None


class BatchResponse(BaseModel):
    id: str
    status: Literal["running", "done", "error"]
    input_count: int
    unique_count: int
    created_at: str
    completed_at: Optional[str] = None
    results: list[ResultRow] = Field(default_factory=list)


class SSEEvent(BaseModel):
    type: Literal["pending", "result", "done", "error"]
    batch_id: str
    index: Optional[int] = None
    row: Optional[dict] = None
    summary: Optional[dict] = None

    def to_sse_payload(self) -> str:
        return f"data: {json.dumps(self.model_dump(exclude_none=True))}\n\n"
```

- [ ] **Step 4: Run — expect pass; commit**

```bash
pytest tests/test_schemas.py -v
git add api/radar/schemas.py api/tests/test_schemas.py
git commit -m "feat(api): add Pydantic schemas for agent output and SSE events"
```

---

### Task 6: SSE event bus

**Files:**
- Create: `api/radar/sse.py`
- Create: `api/tests/test_sse.py`

- [ ] **Step 1: Failing tests**

`api/tests/test_sse.py`:

```python
import pytest
from radar.sse import EventBus
from radar.schemas import SSEEvent


@pytest.mark.asyncio
async def test_publish_then_subscribe_replays():
    bus = EventBus()
    e1 = SSEEvent(type="pending", batch_id="b1", index=0)
    e2 = SSEEvent(type="result", batch_id="b1", index=0, row={"score": 8})

    await bus.publish("b1", e1)
    await bus.publish("b1", e2)

    sub = bus.subscribe("b1")
    await bus.close("b1")

    received = [e async for e in sub]
    assert [e.type for e in received] == ["pending", "result"]


@pytest.mark.asyncio
async def test_separate_batches_isolated():
    bus = EventBus()
    sub_a = bus.subscribe("a")

    await bus.publish("b", SSEEvent(type="pending", batch_id="b", index=0))
    await bus.publish("a", SSEEvent(type="pending", batch_id="a", index=0))
    await bus.close("a")

    received = [e async for e in sub_a]
    assert len(received) == 1
    assert received[0].batch_id == "a"
```

- [ ] **Step 2: Run — expect failure**

```bash
pytest tests/test_sse.py -v
```

- [ ] **Step 3: Implement**

`api/radar/sse.py`:

```python
from __future__ import annotations
import asyncio
from collections import defaultdict
from typing import AsyncIterator
from radar.schemas import SSEEvent


class EventBus:
    """Per-batch in-process pub/sub with replay for late subscribers."""

    def __init__(self) -> None:
        self._buffers: dict[str, list[SSEEvent]] = defaultdict(list)
        self._subs: dict[str, list[asyncio.Queue]] = defaultdict(list)
        self._closed: set[str] = set()
        self._lock = asyncio.Lock()

    async def publish(self, batch_id: str, event: SSEEvent) -> None:
        async with self._lock:
            self._buffers[batch_id].append(event)
            queues = list(self._subs[batch_id])
        for q in queues:
            await q.put(event)

    async def close(self, batch_id: str) -> None:
        async with self._lock:
            self._closed.add(batch_id)
            queues = list(self._subs[batch_id])
        for q in queues:
            await q.put(None)

    def subscribe(self, batch_id: str) -> AsyncIterator[SSEEvent]:
        q: asyncio.Queue = asyncio.Queue()
        for ev in self._buffers[batch_id]:
            q.put_nowait(ev)
        if batch_id in self._closed:
            q.put_nowait(None)
        else:
            self._subs[batch_id].append(q)

        async def _iter():
            while True:
                ev = await q.get()
                if ev is None:
                    return
                yield ev

        return _iter()


bus = EventBus()
```

- [ ] **Step 4: Run — expect pass; commit**

```bash
pytest tests/test_sse.py -v
git add api/radar/sse.py api/tests/test_sse.py
git commit -m "feat(api): add in-process SSE event bus with replay"
```

---

### Task 7: Database layer

**Files:**
- Create: `api/radar/db.py`
- Create: `api/tests/test_db.py`

- [ ] **Step 1: Failing tests**

`api/tests/test_db.py`:

```python
from unittest.mock import MagicMock
import pytest
from radar import db


@pytest.fixture
def fake_supabase():
    client = MagicMock()
    client.postgrest.session = MagicMock()
    client.postgrest.session.headers = {}
    return client


def test_create_batch(fake_supabase, partner_email):
    fake_supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "b1", "partner_email": partner_email, "input_count": 2, "unique_count": 2,
         "status": "running", "created_at": "2026-05-18T00:00:00Z"}
    ]
    repo = db.RadarRepo(fake_supabase)
    batch = repo.create_batch(
        partner_email=partner_email, input_raw="Acme\nGlobex",
        input_count=2, unique_count=2,
    )
    assert batch["id"] == "b1"
    fake_supabase.table.assert_called_with("radar_batches")


def test_insert_pending_results(fake_supabase):
    fake_supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "r1", "account_name": "Acme", "batch_id": "b1", "status": "pending"},
        {"id": "r2", "account_name": "Globex", "batch_id": "b1", "status": "pending"},
    ]
    repo = db.RadarRepo(fake_supabase)
    rows = repo.insert_pending_results("b1", ["Acme", "Globex"])
    assert len(rows) == 2
    assert rows[0]["account_name"] == "Acme"


def test_update_result_done(fake_supabase):
    repo = db.RadarRepo(fake_supabase)
    repo.update_result_done(
        result_id="r1",
        resolved_name="Acme Corp", resolved_domain="acme.com", score=8,
        fit_bullet="x", objection_bullet="x", action_bullet="x",
        sources=["https://acme.com"], agent_run_id="run_123",
    )
    fake_supabase.table.return_value.update.assert_called()


def test_count_batches_today(fake_supabase, partner_email):
    fake_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.execute.return_value.count = 3
    repo = db.RadarRepo(fake_supabase)
    assert repo.count_batches_today(partner_email) == 3
```

- [ ] **Step 2: Run — expect failure**

```bash
pytest tests/test_db.py -v
```

- [ ] **Step 3: Implement**

`api/radar/db.py`:

```python
from __future__ import annotations
import json
import os
from datetime import datetime, timezone
from typing import Optional
from supabase import Client, create_client


def make_client() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


class RadarRepo:
    """All Supabase queries for the radar tool. One method per use case."""

    def __init__(self, client: Client):
        self.c = client

    def _set_partner_jwt(self, email: str) -> None:
        claims = json.dumps({"email": email, "role": "authenticated"})
        self.c.postgrest.session.headers["X-PostgREST-Setting-request.jwt.claims"] = claims

    def create_batch(self, partner_email: str, input_raw: str,
                     input_count: int, unique_count: int) -> dict:
        self._set_partner_jwt(partner_email)
        res = self.c.table("radar_batches").insert({
            "partner_email": partner_email,
            "input_raw": input_raw,
            "input_count": input_count,
            "unique_count": unique_count,
            "status": "running",
        }).execute()
        return res.data[0]

    def insert_pending_results(self, batch_id: str, names: list[str]) -> list[dict]:
        rows = [{"batch_id": batch_id, "account_name": n, "status": "pending"} for n in names]
        res = self.c.table("radar_results").insert(rows).execute()
        return res.data

    def update_result_done(self, result_id: str, resolved_name: Optional[str],
                           resolved_domain: Optional[str], score: Optional[int],
                           fit_bullet: Optional[str], objection_bullet: Optional[str],
                           action_bullet: Optional[str], sources: list[str],
                           agent_run_id: Optional[str]) -> None:
        self.c.table("radar_results").update({
            "status": "done",
            "resolved_name": resolved_name,
            "resolved_domain": resolved_domain,
            "score": score,
            "fit_bullet": fit_bullet,
            "objection_bullet": objection_bullet,
            "action_bullet": action_bullet,
            "sources": sources,
            "agent_run_id": agent_run_id,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", result_id).execute()

    def update_result_error(self, result_id: str, message: str) -> None:
        self.c.table("radar_results").update({
            "status": "error",
            "error_message": message,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", result_id).execute()

    def complete_batch(self, batch_id: str, status: str = "done") -> None:
        self.c.table("radar_batches").update({
            "status": status,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", batch_id).execute()

    def get_batch(self, batch_id: str, partner_email: str) -> Optional[dict]:
        self._set_partner_jwt(partner_email)
        res = self.c.table("radar_batches").select("*").eq("id", batch_id).execute()
        return res.data[0] if res.data else None

    def get_results(self, batch_id: str, partner_email: str) -> list[dict]:
        self._set_partner_jwt(partner_email)
        res = self.c.table("radar_results").select("*").eq("batch_id", batch_id).execute()
        return res.data

    def list_batches(self, partner_email: str, limit: int = 50) -> list[dict]:
        self._set_partner_jwt(partner_email)
        res = (self.c.table("radar_batches").select("*")
               .eq("partner_email", partner_email)
               .order("created_at", desc=True).limit(limit).execute())
        return res.data

    def count_batches_today(self, partner_email: str) -> int:
        self._set_partner_jwt(partner_email)
        midnight = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        ).isoformat()
        res = (self.c.table("radar_batches").select("id", count="exact")
               .eq("partner_email", partner_email)
               .gte("created_at", midnight).execute())
        return res.count or 0
```

- [ ] **Step 4: Run — expect pass; commit**

```bash
pytest tests/test_db.py -v
git add api/radar/db.py api/tests/test_db.py
git commit -m "feat(api): add Supabase repository for radar tables"
```

---

### Task 8: Agent client wrapper

**Files:**
- Create: `api/radar/agent_client.py`
- Create: `api/tests/test_agent_client.py`

- [ ] **Step 1: Failing tests**

`api/tests/test_agent_client.py`:

```python
import json
from unittest.mock import AsyncMock, MagicMock
import pytest
from radar.agent_client import AgentClient, AgentError


def _output(text: str):
    return MagicMock(id="run_x", output=[{"type": "text", "text": text}])


@pytest.mark.asyncio
async def test_score_account_happy():
    fake = MagicMock()
    fake.beta.agents.runs.create = AsyncMock(return_value=_output(json.dumps({
        "resolved_name": "Acme Corp",
        "resolved_domain": "acme.com",
        "score": 8,
        "fit_bullet": "x", "objection_bullet": "y", "action_bullet": "z",
        "sources": ["https://acme.com"],
    })))
    client = AgentClient(anthropic=fake, agent_id="a", env_id="e", retry_delay=0)
    out, run_id = await client.score_account("Acme")
    assert out.score == 8


@pytest.mark.asyncio
async def test_score_account_retries_once_on_parse():
    fake = MagicMock()
    fake.beta.agents.runs.create = AsyncMock(side_effect=[
        _output("not json"),
        _output(json.dumps({
            "resolved_name": "Acme", "resolved_domain": "acme.com", "score": 7,
            "fit_bullet": "x", "objection_bullet": "y", "action_bullet": "z",
            "sources": [],
        })),
    ])
    client = AgentClient(anthropic=fake, agent_id="a", env_id="e", retry_delay=0)
    out, _ = await client.score_account("Acme")
    assert out.score == 7
    assert fake.beta.agents.runs.create.await_count == 2


@pytest.mark.asyncio
async def test_score_account_raises_after_second_failure():
    fake = MagicMock()
    fake.beta.agents.runs.create = AsyncMock(return_value=_output("still not json"))
    client = AgentClient(anthropic=fake, agent_id="a", env_id="e", retry_delay=0)
    with pytest.raises(AgentError):
        await client.score_account("Acme")
```

- [ ] **Step 2: Run — expect failure**

```bash
pytest tests/test_agent_client.py -v
```

- [ ] **Step 3: Implement**

`api/radar/agent_client.py`:

```python
from __future__ import annotations
import asyncio
import os
from typing import Optional
from radar.schemas import AgentOutput


class AgentError(RuntimeError):
    pass


def _extract_text(run) -> str:
    for block in getattr(run, "output", []) or []:
        if isinstance(block, dict) and block.get("type") == "text":
            return block.get("text", "")
        if getattr(block, "type", None) == "text":
            return getattr(block, "text", "")
    raise AgentError("Agent run returned no text block")


def _parse(text: str) -> AgentOutput:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.startswith("json\n"):
            stripped = stripped[5:]
    return AgentOutput.model_validate_json(stripped)


class AgentClient:
    """Async wrapper around anthropic.beta.agents.runs.create with one retry."""

    def __init__(self, anthropic, agent_id: str, env_id: str, retry_delay: float = 5.0):
        self.anthropic = anthropic
        self.agent_id = agent_id
        self.env_id = env_id
        self.retry_delay = retry_delay

    async def score_account(self, account_name: str) -> tuple[AgentOutput, str]:
        last_err: Optional[Exception] = None
        for attempt in (1, 2):
            try:
                run = await self.anthropic.beta.agents.runs.create(
                    agent_id=self.agent_id,
                    environment_id=self.env_id,
                    input=account_name,
                )
                return _parse(_extract_text(run)), getattr(run, "id", "")
            except Exception as e:
                last_err = e
                if attempt == 1 and self.retry_delay > 0:
                    await asyncio.sleep(self.retry_delay)
        raise AgentError(f"Agent failed after retry: {last_err}") from last_err


def make_client_from_env(anthropic) -> AgentClient:
    return AgentClient(
        anthropic=anthropic,
        agent_id=os.environ["ALKIRA_RADAR_AGENT_ID"],
        env_id=os.environ["ALKIRA_RADAR_ENV_ID"],
    )
```

- [ ] **Step 4: Run — expect pass; commit**

```bash
pytest tests/test_agent_client.py -v
git add api/radar/agent_client.py api/tests/test_agent_client.py
git commit -m "feat(api): add async agent client with one-retry on parse failure"
```

---

### Task 9: Orchestrator

**Files:**
- Create: `api/radar/orchestrator.py`
- Create: `api/tests/test_orchestrator.py`

- [ ] **Step 1: Failing tests**

`api/tests/test_orchestrator.py`:

```python
from unittest.mock import AsyncMock, MagicMock
import pytest
from radar.orchestrator import RadarOrchestrator
from radar.schemas import AgentOutput
from radar.sse import EventBus


def _ok(name: str, score: int = 8) -> AgentOutput:
    return AgentOutput(
        resolved_name=f"{name} Corp", resolved_domain=f"{name.lower()}.com",
        score=score, fit_bullet="fit", objection_bullet="obj", action_bullet="act",
        sources=["https://x"],
    )


@pytest.mark.asyncio
async def test_runs_all_and_emits_events():
    agent = MagicMock()
    agent.score_account = AsyncMock(side_effect=[(_ok("Acme"), "r1"), (_ok("Globex", 6), "r2")])
    repo = MagicMock()
    repo.insert_pending_results.return_value = [
        {"id": "r1", "account_name": "Acme"}, {"id": "r2", "account_name": "Globex"},
    ]
    bus = EventBus()
    orch = RadarOrchestrator(agent=agent, repo=repo, bus=bus, concurrency=2)
    sub = bus.subscribe("b1")
    await orch.run("b1", ["Acme", "Globex"])
    events = [e async for e in sub]
    types = [e.type for e in events]
    assert types.count("pending") == 2
    assert types.count("result") == 2
    assert types.count("done") == 1
    repo.complete_batch.assert_called_once_with("b1", status="done")


@pytest.mark.asyncio
async def test_failure_does_not_block_other_rows():
    agent = MagicMock()
    agent.score_account = AsyncMock(side_effect=[Exception("boom"), (_ok("Globex"), "r2")])
    repo = MagicMock()
    repo.insert_pending_results.return_value = [
        {"id": "r1", "account_name": "Acme"}, {"id": "r2", "account_name": "Globex"},
    ]
    bus = EventBus()
    orch = RadarOrchestrator(agent=agent, repo=repo, bus=bus, concurrency=2)
    sub = bus.subscribe("b1")
    await orch.run("b1", ["Acme", "Globex"])
    events = [e async for e in sub]
    errors = [e for e in events if e.type == "result" and e.row.get("status") == "error"]
    oks = [e for e in events if e.type == "result" and e.row.get("status") == "done"]
    assert len(errors) == 1 and len(oks) == 1
    repo.update_result_error.assert_called_once()
```

- [ ] **Step 2: Run — expect failure**

```bash
pytest tests/test_orchestrator.py -v
```

- [ ] **Step 3: Implement**

`api/radar/orchestrator.py`:

```python
from __future__ import annotations
import asyncio
import logging
from radar.schemas import SSEEvent
from radar.sse import EventBus

log = logging.getLogger(__name__)


class RadarOrchestrator:
    """Run N agent calls in parallel under a semaphore, persist and stream."""

    def __init__(self, agent, repo, bus: EventBus, concurrency: int = 8):
        self.agent = agent
        self.repo = repo
        self.bus = bus
        self.sem = asyncio.Semaphore(concurrency)

    async def run(self, batch_id: str, account_names: list[str]) -> None:
        rows = self.repo.insert_pending_results(batch_id, account_names)
        for i, row in enumerate(rows):
            await self.bus.publish(batch_id, SSEEvent(
                type="pending", batch_id=batch_id, index=i,
                row={"id": row["id"], "account_name": row["account_name"], "status": "pending"},
            ))
        await asyncio.gather(*[self._run_one(batch_id, i, r) for i, r in enumerate(rows)])
        self.repo.complete_batch(batch_id, status="done")
        await self.bus.publish(batch_id, SSEEvent(type="done", batch_id=batch_id))
        await self.bus.close(batch_id)

    async def _run_one(self, batch_id: str, index: int, row: dict) -> None:
        async with self.sem:
            try:
                output, run_id = await self.agent.score_account(row["account_name"])
                if output.status == "not_found":
                    self.repo.update_result_error(row["id"], output.error_message or "not found")
                    await self.bus.publish(batch_id, SSEEvent(
                        type="result", batch_id=batch_id, index=index,
                        row={"id": row["id"], "account_name": row["account_name"],
                             "status": "error", "error_message": output.error_message},
                    ))
                    return
                self.repo.update_result_done(
                    result_id=row["id"],
                    resolved_name=output.resolved_name,
                    resolved_domain=output.resolved_domain,
                    score=output.score,
                    fit_bullet=output.fit_bullet,
                    objection_bullet=output.objection_bullet,
                    action_bullet=output.action_bullet,
                    sources=output.sources,
                    agent_run_id=run_id,
                )
                await self.bus.publish(batch_id, SSEEvent(
                    type="result", batch_id=batch_id, index=index,
                    row={
                        "id": row["id"],
                        "account_name": row["account_name"],
                        "resolved_name": output.resolved_name,
                        "resolved_domain": output.resolved_domain,
                        "score": output.score,
                        "fit_bullet": output.fit_bullet,
                        "objection_bullet": output.objection_bullet,
                        "action_bullet": output.action_bullet,
                        "sources": output.sources,
                        "status": "done",
                    },
                ))
            except Exception as e:
                log.exception("agent failed for %s", row["account_name"])
                try:
                    self.repo.update_result_error(row["id"], str(e)[:500])
                except Exception:
                    log.exception("update_result_error failed")
                await self.bus.publish(batch_id, SSEEvent(
                    type="result", batch_id=batch_id, index=index,
                    row={"id": row["id"], "account_name": row["account_name"],
                         "status": "error", "error_message": str(e)[:500]},
                ))
```

- [ ] **Step 4: Run — expect pass; commit**

```bash
pytest tests/test_orchestrator.py -v
git add api/radar/orchestrator.py api/tests/test_orchestrator.py
git commit -m "feat(api): add async orchestrator with concurrency cap and isolation"
```

---

### Task 10: Auth dependency

**Files:**
- Create: `api/radar/auth.py`

- [ ] **Step 1: Implement**

`api/radar/auth.py`:

```python
from fastapi import Header, HTTPException


async def require_partner_email(x_auth_email: str | None = Header(default=None)) -> str:
    """Trust the X-Auth-Email header set by nginx.

    FastAPI binds to 127.0.0.1 only. nginx strips any client-supplied
    X-Auth-Email and sets its own from the auth-proxy result. Therefore
    receiving this header here is sufficient proof of authentication.
    """
    if not x_auth_email:
        raise HTTPException(status_code=401, detail="missing auth")
    if "@" not in x_auth_email:
        raise HTTPException(status_code=401, detail="invalid auth")
    return x_auth_email.lower()
```

- [ ] **Step 2: Commit**

```bash
git add api/radar/auth.py
git commit -m "feat(api): add X-Auth-Email FastAPI dependency"
```

---

### Task 11: FastAPI routes

**Files:**
- Create: `api/radar/api.py`
- Create: `api/tests/test_api.py`

- [ ] **Step 1: Failing tests**

`api/tests/test_api.py`:

```python
from unittest.mock import AsyncMock, MagicMock
import pytest
from fastapi.testclient import TestClient
from radar.api import build_app


@pytest.fixture
def harness():
    repo = MagicMock()
    repo.create_batch.return_value = {
        "id": "b1", "input_count": 2, "unique_count": 2,
        "status": "running", "created_at": "2026-05-18T00:00:00Z",
    }
    repo.count_batches_today.return_value = 0
    repo.list_batches.return_value = []
    repo.get_batch.return_value = {
        "id": "b1", "input_count": 2, "unique_count": 2, "status": "done",
        "created_at": "2026-05-18T00:00:00Z", "completed_at": None,
    }
    repo.get_results.return_value = []
    orch = MagicMock(); orch.run = AsyncMock()
    app = build_app(
        repo_factory=lambda: repo,
        orchestrator_factory=lambda r: orch,
    )
    return TestClient(app), repo, orch


def test_run_requires_auth(harness):
    tc, _, _ = harness
    resp = tc.post("/api/radar/run", json={"raw": "Acme\nGlobex"})
    assert resp.status_code == 401


def test_run_creates_batch_and_kicks_orchestrator(harness):
    tc, repo, orch = harness
    resp = tc.post("/api/radar/run", json={"raw": "Acme\nGlobex"},
                   headers={"X-Auth-Email": "p@x.com"})
    assert resp.status_code == 200
    assert resp.json()["id"] == "b1"
    repo.create_batch.assert_called_once()
    orch.run.assert_called_once()


def test_run_blocks_daily_cap(harness):
    tc, repo, _ = harness
    repo.count_batches_today.return_value = 5
    resp = tc.post("/api/radar/run", json={"raw": "Acme"},
                   headers={"X-Auth-Email": "p@x.com"})
    assert resp.status_code == 429


def test_run_blocks_oversize(harness):
    tc, _, _ = harness
    big = "\n".join(f"Co{i}" for i in range(41))
    resp = tc.post("/api/radar/run", json={"raw": big},
                   headers={"X-Auth-Email": "p@x.com"})
    assert resp.status_code == 400
    assert "40 or fewer" in resp.json()["detail"]


def test_history_returns_partner_batches(harness):
    tc, repo, _ = harness
    repo.list_batches.return_value = [{"id": "b1", "input_count": 2, "unique_count": 2,
                                       "status": "done", "created_at": "2026-05-18T00:00:00Z"}]
    resp = tc.get("/api/radar/history", headers={"X-Auth-Email": "p@x.com"})
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_get_batch_404_when_rls_hides(harness):
    tc, repo, _ = harness
    repo.get_batch.return_value = None
    resp = tc.get("/api/radar/batch/b1", headers={"X-Auth-Email": "p@x.com"})
    assert resp.status_code == 404
```

- [ ] **Step 2: Run — expect failure**

```bash
pytest tests/test_api.py -v
```

- [ ] **Step 3: Implement**

`api/radar/api.py`:

```python
from __future__ import annotations
import asyncio
import os
from typing import Callable
from anthropic import AsyncAnthropic
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from radar import auth, db
from radar.agent_client import make_client_from_env
from radar.orchestrator import RadarOrchestrator
from radar.parser import ParseError, parse_accounts
from radar.schemas import BatchCreateRequest, BatchResponse, ResultRow
from radar.sse import bus

RepoFactory = Callable[[], db.RadarRepo]
OrchestratorFactory = Callable[[db.RadarRepo], RadarOrchestrator]


def _default_repo() -> db.RadarRepo:
    return db.RadarRepo(db.make_client())


def _default_orchestrator(repo: db.RadarRepo) -> RadarOrchestrator:
    agent = make_client_from_env(AsyncAnthropic())
    return RadarOrchestrator(
        agent=agent, repo=repo, bus=bus,
        concurrency=int(os.environ.get("RADAR_AGENT_CONCURRENCY", "8")),
    )


def build_app(
    repo_factory: RepoFactory = _default_repo,
    orchestrator_factory: OrchestratorFactory = _default_orchestrator,
) -> FastAPI:
    app = FastAPI(title="Alkira Account Radar API")
    daily_limit = int(os.environ.get("RADAR_DAILY_BATCH_LIMIT", "5"))
    max_size = int(os.environ.get("RADAR_MAX_BATCH_SIZE", "40"))

    @app.post("/api/radar/run")
    async def create_run(
        req: BatchCreateRequest,
        partner_email: str = Depends(auth.require_partner_email),
    ) -> dict:
        repo = repo_factory()
        if repo.count_batches_today(partner_email) >= daily_limit:
            raise HTTPException(status_code=429, detail="Daily limit reached.")
        try:
            names, unique = parse_accounts(req.raw, max_size=max_size)
        except ParseError as e:
            raise HTTPException(status_code=400, detail=str(e))
        batch = repo.create_batch(
            partner_email=partner_email,
            input_raw=req.raw,
            input_count=len([s for s in req.raw.replace(",", "\n").splitlines() if s.strip()]),
            unique_count=unique,
        )
        orch = orchestrator_factory(repo)
        asyncio.create_task(orch.run(batch["id"], names))
        return {
            "id": batch["id"],
            "input_count": batch["input_count"],
            "unique_count": batch["unique_count"],
            "status": batch["status"],
            "created_at": batch["created_at"],
        }

    @app.get("/api/radar/run/{batch_id}")
    async def stream_run(
        batch_id: str, request: Request,
        partner_email: str = Depends(auth.require_partner_email),
    ):
        repo = repo_factory()
        if not repo.get_batch(batch_id, partner_email):
            raise HTTPException(status_code=404, detail="not found")

        async def event_stream():
            sub = bus.subscribe(batch_id)
            async for ev in sub:
                if await request.is_disconnected():
                    break
                yield ev.to_sse_payload()

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    @app.get("/api/radar/history")
    async def history(partner_email: str = Depends(auth.require_partner_email)) -> list[dict]:
        return repo_factory().list_batches(partner_email)

    @app.get("/api/radar/batch/{batch_id}", response_model=BatchResponse)
    async def get_batch(
        batch_id: str,
        partner_email: str = Depends(auth.require_partner_email),
    ) -> BatchResponse:
        repo = repo_factory()
        batch = repo.get_batch(batch_id, partner_email)
        if not batch:
            raise HTTPException(status_code=404, detail="not found")
        results = repo.get_results(batch_id, partner_email)
        return BatchResponse(
            id=batch["id"], status=batch["status"],
            input_count=batch["input_count"], unique_count=batch["unique_count"],
            created_at=batch["created_at"], completed_at=batch.get("completed_at"),
            results=[ResultRow(**r) for r in results],
        )

    @app.get("/api/radar/health")
    async def health() -> dict:
        return {"ok": True}

    return app


app = build_app()
```

- [ ] **Step 4: Run — expect pass**

```bash
pytest tests/test_api.py -v
```

- [ ] **Step 5: Full suite with coverage**

```bash
pytest --cov=radar --cov-report=term-missing -v
```

Expected: all pass, `radar/` coverage ≥ 80%.

- [ ] **Step 6: Commit**

```bash
git add api/radar/api.py api/tests/test_api.py
git commit -m "feat(api): wire FastAPI routes for run, stream, history, batch"
```

---

## Phase 3 — Agent + Skill

### Task 12: System prompt

**Files:**
- Create: `api/radar/system_prompt.py`

- [ ] **Step 1: Write**

`api/radar/system_prompt.py`:

```python
ALKIRA_RADAR_SYSTEM_PROMPT = """You are the Alkira Account Radar Scorer.

You receive a single account name and return EXACTLY ONE JSON object scoring its fit for Alkira's multi-cloud networking platform. Do not include any prose before or after the JSON. Do not wrap in markdown code fences.

Process:
1. Use web_search to gather public information about the company — recent news, SEC filings, job postings, cloud presence, networking footprint, leadership changes, competitive vendor mentions.
2. Consult the alkira-customer skill for Alkira fit criteria, ICP, use cases, and competitive landscape.
3. Consult the alkira-radar-rubric skill for the 1-10 scoring rubric and required output schema.
4. Apply stop-slop to keep bullets specific and free of generic AI patterns.

Rules:
- If the account name is ambiguous (e.g., "Acme"), pick the largest US-headquartered company matching that name and STATE the assumption in fit_bullet (e.g., "Assumed Acme Corp, Austin, ~$200M revenue").
- If no useful public information exists for any plausible match, return {"status": "not_found", ...} per the rubric skill.
- Never invent facts. Every claim in a bullet must be traceable to a source URL you include in `sources`.
- Each bullet is one tight sentence (or two short ones), naming a specific signal — not a generic platitude.
- fit_bullet: strongest reason this is a fit
- objection_bullet: likeliest objection or risk (current vendor lock-in, recent contracts, internal politics, etc.)
- action_bullet: which Alkira use case to lead with for this account specifically
- Return 2-4 source URLs in `sources` that you actually used.

Output exactly the JSON schema from the alkira-radar-rubric skill. No other output.
"""
```

- [ ] **Step 2: Commit**

```bash
git add api/radar/system_prompt.py
git commit -m "feat(api): add Alkira Radar Scorer system prompt"
```

---

### Task 13: alkira-radar-rubric skill source

**Files:**
- Create: `skills/alkira-radar-rubric/SKILL.md`

- [ ] **Step 1: Write the skill**

`skills/alkira-radar-rubric/SKILL.md`:

```markdown
---
name: alkira-radar-rubric
description: Use this skill whenever scoring an account for Alkira fit in the Radar tool. Provides the 1-10 rubric, calibration against brief-gen's 1-5 scale, and the strict JSON output schema each scoring run MUST return.
---

# Alkira Radar Scoring Rubric

You are scoring ONE company at a time on a 1-10 fit scale for Alkira. Apply this rubric uniformly so partners can compare scores across batches and across the Radar and brief-gen tools.

## Scoring Bands

| Score | Meaning | Action implication |
|---|---|---|
| 10 | Active trigger event + clear Alkira use case + open buying window. Hot now. | Brief and reach out this week. |
| 8-9 | Strong fit. Clear use case, multicloud reality, no major lock-in blocker. | Brief and reach out within 2 weeks. |
| 5-7 | Plausible fit, needs discovery. Some signals but unclear timing or use case. | Worth a discovery call, not a cold pitch. |
| 3-4 | Weak fit. Would need an unusual hook to justify partner time. | Park, revisit in a quarter. |
| 1-2 | Wrong size, wrong vertical, OR actively hostile (recent multi-year lock-in with a direct competitor). | Skip. |

## Calibration with brief-gen

Brief-gen scores on 1-5. Radar scores on 1-10. As a rough mapping: `radar_score ≈ 2 × briefgen_score`. A brief-gen 4 ≈ Radar 8. Use this so partners running both tools see consistent signal.

## What moves a score up

- Recently announced multicloud strategy or migration
- Network team hiring (cloud architects, network engineers)
- Mentions of "network sprawl", "VPC peering complexity", "MPLS replacement"
- Existing footprint with Alkira-friendly partners (cloud providers, security vendors that integrate)
- Recent M&A creating cross-network integration problems
- Public commitment to backbone-as-a-service or NaaS narratives
- Compliance/regulatory pressure driving network segmentation

## What moves a score down

- Recent multi-year contract with a direct competitor (Aviatrix, Megaport, etc.)
- Single-cloud commitment language ("all-in on AWS")
- Recent network team layoffs
- Tiny networking footprint (small SaaS startup, no real network problem)
- Company under acquisition (buyer's stack will dominate)

## Output Schema (REQUIRED)

Return EXACTLY ONE JSON object with no other text:

```json
{
  "resolved_name": "Acme Corporation",
  "resolved_domain": "acme.com",
  "score": 8,
  "fit_bullet": "One sentence naming the strongest specific signal.",
  "objection_bullet": "One sentence naming the most likely objection.",
  "action_bullet": "One sentence naming which Alkira use case to lead with.",
  "sources": ["https://...", "https://...", "..."]
}
```

If the company cannot be identified or has no usable public information:

```json
{
  "resolved_name": null,
  "resolved_domain": null,
  "score": null,
  "status": "not_found",
  "error_message": "No public information found for '<name>'. Try adding a domain.",
  "sources": []
}
```

## Bullet Quality Rules

- Name a specific signal with a specific source — not a vague claim
- One sentence each (two short is acceptable for objection)
- No generic phrases like "leading provider", "digital transformation", "leveraging the cloud"
- The action bullet should name an Alkira use case (multicloud backbone, firewall consolidation, extranet, etc.) and tie it to something the company is actually doing
- If you had to disambiguate the name, lead fit_bullet with the assumption ("Assumed Acme Corp, Austin, ~$200M revenue.")
```

- [ ] **Step 2: Commit**

```bash
git add skills/alkira-radar-rubric/
git commit -m "feat(skills): add alkira-radar-rubric skill source"
```

---

### Task 14: Skill upload script

**Files:**
- Create: `api/radar/setup_skills.py`

- [ ] **Step 1: Write**

`api/radar/setup_skills.py`:

```python
"""Upload the alkira-radar-rubric skill to Anthropic.

Run once after editing the skill source. Writes the resulting skill ID to .env.

Usage:
    python -m radar.setup_skills
"""
import os
from pathlib import Path
from anthropic import Anthropic
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
SKILL_DIR = ROOT / "skills" / "alkira-radar-rubric"
ENV_FILE = ROOT / ".env"

load_dotenv(ENV_FILE)


def upload() -> str:
    client = Anthropic()
    skill_md = (SKILL_DIR / "SKILL.md").read_text()
    print(f"Uploading skill from {SKILL_DIR}...")
    skill = client.beta.skills.create(
        name="alkira-radar-rubric",
        display_name="Alkira Radar Rubric",
        description="1-10 scoring rubric and JSON output schema for the Radar tool",
        files=[{"name": "SKILL.md", "content": skill_md}],
    )
    print(f"  Skill ID: {skill.id}")
    return skill.id


def update_env(skill_id: str) -> None:
    lines = ENV_FILE.read_text().splitlines() if ENV_FILE.exists() else []
    out: list[str] = []
    found = False
    for line in lines:
        if line.startswith("ALKIRA_RADAR_RUBRIC_SKILL_ID="):
            out.append(f"ALKIRA_RADAR_RUBRIC_SKILL_ID={skill_id}")
            found = True
        else:
            out.append(line)
    if not found:
        out.append(f"ALKIRA_RADAR_RUBRIC_SKILL_ID={skill_id}")
    ENV_FILE.write_text("\n".join(out) + "\n")
    print(f"Wrote ALKIRA_RADAR_RUBRIC_SKILL_ID to {ENV_FILE}")


if __name__ == "__main__":
    update_env(upload())
```

- [ ] **Step 2: Commit**

```bash
git add api/radar/setup_skills.py
git commit -m "feat(api): add setup_skills.py to upload alkira-radar-rubric"
```

---

### Task 15: Agent setup script

**Files:**
- Create: `api/radar/setup_agent.py`

- [ ] **Step 1: Write**

`api/radar/setup_agent.py`:

```python
"""Create the Alkira Account Radar Scorer managed agent + environment.

Prereq: run setup_skills.py first AND ensure ALKIRA_CUSTOMER_SKILL_ID and
STOP_SLOP_SKILL_ID are populated in .env (reused from brief-gen).

Usage:
    python -m radar.setup_agent
"""
import os
from pathlib import Path
from anthropic import Anthropic
from dotenv import load_dotenv
from radar.system_prompt import ALKIRA_RADAR_SYSTEM_PROMPT

ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT / ".env"
load_dotenv(ENV_FILE)

REQUIRED = ["ALKIRA_CUSTOMER_SKILL_ID", "ALKIRA_RADAR_RUBRIC_SKILL_ID", "STOP_SLOP_SKILL_ID"]


def main() -> None:
    missing = [k for k in REQUIRED if not os.environ.get(k)]
    if missing:
        raise SystemExit(f"Missing env vars: {missing}. Run setup_skills.py "
                         "and populate brief-gen skill IDs first.")

    skills = [
        {"type": "custom", "skill_id": os.environ[k], "version": "latest"}
        for k in REQUIRED
    ]
    client = Anthropic()

    print("Creating agent...")
    agent = client.beta.agents.create(
        name="Alkira Account Radar Scorer",
        description="Scores a single account 1-10 for Alkira fit and returns "
                    "fit/objection/action bullets as JSON.",
        model="claude-sonnet-4-6",
        system=ALKIRA_RADAR_SYSTEM_PROMPT,
        tools=[{
            "type": "agent_toolset_20260401",
            "configs": [
                {"name": "web_search", "enabled": True},
                {"name": "write", "enabled": False},
                {"name": "edit", "enabled": False},
            ],
        }],
        skills=skills,
    )
    print(f"  Agent ID: {agent.id}")

    print("Creating environment...")
    environment = client.beta.environments.create(
        name="alkira-radar-env",
        config={"type": "cloud", "networking": {"type": "unrestricted"}},
    )
    print(f"  Environment ID: {environment.id}")

    _write_env({"ALKIRA_RADAR_AGENT_ID": agent.id, "ALKIRA_RADAR_ENV_ID": environment.id})


def _write_env(updates: dict[str, str]) -> None:
    lines = ENV_FILE.read_text().splitlines() if ENV_FILE.exists() else []
    keys = set(updates)
    out: list[str] = []
    for line in lines:
        k = line.split("=", 1)[0]
        if k in keys:
            out.append(f"{k}={updates[k]}")
            keys.discard(k)
        else:
            out.append(line)
    for k in keys:
        out.append(f"{k}={updates[k]}")
    ENV_FILE.write_text("\n".join(out) + "\n")
    print(f"Wrote agent IDs to {ENV_FILE}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add api/radar/setup_agent.py
git commit -m "feat(api): add setup_agent.py to create managed agent + env"
```

---

## Phase 4 — Frontend (TDD)

### Task 16: Next.js scaffolding

**Files:**
- Create: `web/package.json`, `web/tsconfig.json`, `web/next.config.ts`,
  `web/tailwind.config.ts`, `web/postcss.config.mjs`, `web/vitest.config.ts`,
  `web/playwright.config.ts`, `web/app/layout.tsx`, `web/app/globals.css`

- [ ] **Step 1: `web/package.json`**

```json
{
  "name": "alkira-radar-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test"
  },
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "happy-dom": "^15.11.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": { "@/*": ["./*"] },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: `web/next.config.ts`**

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: { typedRoutes: true },
};

export default config;
```

- [ ] **Step 4: `web/tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "oklch(18% 0 0)",
        surface: "oklch(98% 0 0)",
        accent: "oklch(60% 0.18 250)",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: `web/postcss.config.mjs`**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 6: `web/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["tests/e2e/**"],
  },
});
```

- [ ] **Step 7: `web/playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run start",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 8: `web/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light; }

body {
  @apply bg-surface text-ink antialiased;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
}
```

- [ ] **Step 9: `web/app/layout.tsx`**

```tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alkira Account Radar",
  description: "Score up to 40 accounts at a time for Alkira fit",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 10: Install + verify**

```bash
cd web && npm install
```

- [ ] **Step 11: Commit**

```bash
git add web/package.json web/tsconfig.json web/next.config.ts web/tailwind.config.ts \
        web/postcss.config.mjs web/vitest.config.ts web/playwright.config.ts \
        web/app/layout.tsx web/app/globals.css
git commit -m "chore(web): scaffold Next.js + Tailwind + Vitest + Playwright"
```

---

### Task 17: Shared TypeScript types

**Files:**
- Create: `web/lib/types.ts`

- [ ] **Step 1: Write**

`web/lib/types.ts`:

```ts
export type ResultStatus = "pending" | "done" | "error";
export type BatchStatus = "running" | "done" | "error";

export interface ResultRow {
  id: string;
  account_name: string;
  resolved_name: string | null;
  resolved_domain: string | null;
  score: number | null;
  fit_bullet: string | null;
  objection_bullet: string | null;
  action_bullet: string | null;
  sources: string[];
  status: ResultStatus;
  error_message: string | null;
}

export interface Batch {
  id: string;
  status: BatchStatus;
  input_count: number;
  unique_count: number;
  created_at: string;
  completed_at: string | null;
  results: ResultRow[];
}

export interface BatchSummary {
  id: string;
  status: BatchStatus;
  unique_count: number;
  created_at: string;
}

export type SSEEvent =
  | { type: "pending"; batch_id: string; index: number; row: Partial<ResultRow> }
  | { type: "result"; batch_id: string; index: number; row: Partial<ResultRow> }
  | { type: "done"; batch_id: string }
  | { type: "error"; batch_id: string; row?: Partial<ResultRow> };
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/types.ts
git commit -m "feat(web): add shared types for results and SSE events"
```

---

### Task 18: parse-input.ts (Python parity)

**Files:**
- Create: `web/lib/parse-input.ts`
- Create: `web/tests/parse-input.test.ts`

- [ ] **Step 1: Failing tests (mirror Python cases)**

`web/tests/parse-input.test.ts`:

```ts
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
```

- [ ] **Step 2: Run — expect failure**

```bash
cd web && npm test
```

- [ ] **Step 3: Implement**

`web/lib/parse-input.ts`:

```ts
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

const DELIMITERS = /[,\n\r\t]+/;

export function parseAccounts(
  raw: string,
  maxSize = 40,
): { accounts: string[]; unique: number } {
  const candidates = raw
    .split(DELIMITERS)
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const accounts: string[] = [];
  for (const name of candidates) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    accounts.push(name);
  }

  if (accounts.length === 0) {
    throw new ParseError("Add at least one account name.");
  }
  if (accounts.length > maxSize) {
    throw new ParseError(
      `Please split into batches of ${maxSize} or fewer (you entered ${accounts.length} unique accounts).`,
    );
  }
  return { accounts, unique: accounts.length };
}
```

- [ ] **Step 4: Run — expect pass; commit**

```bash
npm test
git add web/lib/parse-input.ts web/tests/parse-input.test.ts
git commit -m "feat(web): add input parser with case-insensitive dedupe (Python parity)"
```

---

### Task 19: score-color.ts

**Files:**
- Create: `web/lib/score-color.ts`
- Create: `web/tests/score-color.test.ts`

- [ ] **Step 1: Failing tests**

`web/tests/score-color.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { scoreBand, scoreColor } from "@/lib/score-color";

describe("scoreBand", () => {
  it.each([
    [10, "hot"], [8, "hot"], [7, "warm"], [5, "warm"], [4, "cool"], [1, "cool"],
  ])("score %i → %s", (score, expected) => {
    expect(scoreBand(score)).toBe(expected);
  });
  it("null is unknown", () => expect(scoreBand(null)).toBe("unknown"));
});

describe("scoreColor", () => {
  it("returns a non-empty color for each band", () => {
    [10, 7, 3, null].forEach((s) => expect(scoreColor(s as number | null)).toBeTruthy());
  });
});
```

- [ ] **Step 2: Implement**

`web/lib/score-color.ts`:

```ts
export type ScoreBand = "hot" | "warm" | "cool" | "unknown";

export function scoreBand(score: number | null): ScoreBand {
  if (score == null) return "unknown";
  if (score >= 8) return "hot";
  if (score >= 5) return "warm";
  return "cool";
}

const COLORS: Record<ScoreBand, string> = {
  hot: "oklch(62% 0.20 25)",
  warm: "oklch(78% 0.16 75)",
  cool: "oklch(72% 0.06 240)",
  unknown: "oklch(80% 0 0)",
};

export function scoreColor(score: number | null): string {
  return COLORS[scoreBand(score)];
}
```

- [ ] **Step 3: Run + commit**

```bash
npm test
git add web/lib/score-color.ts web/tests/score-color.test.ts
git commit -m "feat(web): add score band/color mapping"
```

---

### Task 20: SSE client

**Files:**
- Create: `web/lib/sse-client.ts`
- Create: `web/tests/sse-client.test.ts`

- [ ] **Step 1: Failing tests**

`web/tests/sse-client.test.ts`:

```ts
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
```

- [ ] **Step 2: Implement**

`web/lib/sse-client.ts`:

```ts
import type { SSEEvent } from "./types";

export function parseSSELine(line: string): SSEEvent | null {
  if (!line || line.startsWith(":")) return null;
  if (!line.startsWith("data: ")) return null;
  try {
    return JSON.parse(line.slice(6)) as SSEEvent;
  } catch {
    return null;
  }
}

export interface SSESubscription {
  close(): void;
}

export function subscribeToBatch(
  batchId: string,
  onEvent: (e: SSEEvent) => void,
  onError?: (err: unknown) => void,
): SSESubscription {
  const url = `/api/radar/run/${encodeURIComponent(batchId)}`;
  const source = new EventSource(url, { withCredentials: true });
  source.onmessage = (msg) => {
    const ev = parseSSELine(`data: ${msg.data}`);
    if (ev) onEvent(ev);
  };
  source.onerror = (err) => onError?.(err);
  return { close: () => source.close() };
}
```

- [ ] **Step 3: Run + commit**

```bash
npm test
git add web/lib/sse-client.ts web/tests/sse-client.test.ts
git commit -m "feat(web): add SSE client and parser"
```

---

### Task 21: API client + ScoreBadge

**Files:**
- Create: `web/lib/api-client.ts`
- Create: `web/components/score-badge.tsx`

- [ ] **Step 1: API client**

`web/lib/api-client.ts`:

```ts
import type { Batch, BatchSummary } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api/radar";

export async function createBatch(raw: string): Promise<{ id: string; unique_count: number }> {
  const res = await fetch(`${BASE}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json();
}

export async function fetchHistory(): Promise<BatchSummary[]> {
  const res = await fetch(`${BASE}/history`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchBatch(batchId: string): Promise<Batch> {
  const res = await fetch(`${BASE}/batch/${encodeURIComponent(batchId)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

- [ ] **Step 2: ScoreBadge**

`web/components/score-badge.tsx`:

```tsx
import { scoreBand, scoreColor } from "@/lib/score-color";

export function ScoreBadge({ score }: { score: number | null }) {
  const band = scoreBand(score);
  const color = scoreColor(score);
  return (
    <div
      className="inline-flex items-center justify-center rounded-lg px-3 py-1 text-sm font-semibold text-white shadow-sm"
      style={{ backgroundColor: color }}
      aria-label={`Score ${score ?? "unknown"} (${band})`}
    >
      {score == null ? "—" : `${score}/10`}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/lib/api-client.ts web/components/score-badge.tsx
git commit -m "feat(web): add API client and ScoreBadge"
```

---

### Task 22: InputForm

**Files:**
- Create: `web/components/input-form.tsx`

- [ ] **Step 1: Write**

`web/components/input-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { parseAccounts, ParseError } from "@/lib/parse-input";

interface Props {
  onSubmit: (raw: string) => Promise<void>;
  disabled?: boolean;
}

export function InputForm({ onSubmit, disabled }: Props) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const previewCount = (() => {
    try { return parseAccounts(raw).unique; } catch { return null; }
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      parseAccounts(raw);
    } catch (err) {
      setError(err instanceof ParseError ? err.message : "Invalid input");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(raw);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="accounts" className="block text-sm font-medium">
        Account names (comma, newline, or tab separated, up to 40)
      </label>
      <textarea
        id="accounts"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={10}
        className="w-full rounded-lg border border-ink/15 p-3 font-mono text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        placeholder="Acme&#10;Globex, Initech&#10;Wayne Enterprises"
        disabled={disabled || submitting}
        aria-describedby="account-count"
      />
      <div className="flex items-center justify-between">
        <span id="account-count" className="text-sm text-ink/60">
          {previewCount != null ? `${previewCount} unique` : "—"}
        </span>
        <button
          type="submit"
          disabled={disabled || submitting || !raw.trim()}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Starting…" : "Score Accounts"}
        </button>
      </div>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/input-form.tsx
git commit -m "feat(web): add InputForm with client-side validation"
```

---

### Task 23: ResultRow + ResultsTable

**Files:**
- Create: `web/components/result-row.tsx`
- Create: `web/components/results-table.tsx`

- [ ] **Step 1: ResultRow**

`web/components/result-row.tsx`:

```tsx
import { ScoreBadge } from "./score-badge";
import type { ResultRow as Row } from "@/lib/types";

interface Props {
  row: Row;
  briefgenUrl: string;
}

export function ResultRow({ row, briefgenUrl }: Props) {
  const isPending = row.status === "pending";
  const isError = row.status === "error";

  const handoff = (() => {
    if (!row.resolved_name) return null;
    const params = new URLSearchParams({
      company: row.resolved_name,
      ...(row.resolved_domain ? { domain: row.resolved_domain } : {}),
    });
    return `${briefgenUrl}/?${params.toString()}`;
  })();

  return (
    <article className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <ScoreBadge score={row.score} />
          <div>
            <h3 className="font-semibold leading-tight">
              {row.resolved_name ?? row.account_name}
            </h3>
            {row.resolved_domain ? (
              <p className="text-sm text-ink/60">{row.resolved_domain}</p>
            ) : null}
          </div>
        </div>
        {handoff ? (
          <a
            href={handoff}
            className="rounded-md border border-ink/15 px-3 py-1.5 text-sm font-medium hover:bg-ink/5"
          >
            Generate brief →
          </a>
        ) : null}
      </header>

      {isPending ? (
        <p className="mt-3 text-sm italic text-ink/60" role="status">
          Researching…
        </p>
      ) : isError ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {row.error_message ?? "Failed to score this account."}
        </p>
      ) : (
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-green-700">Fit:</dt>
            <dd>{row.fit_bullet}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-amber-700">Objection:</dt>
            <dd>{row.objection_bullet}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-accent">Action:</dt>
            <dd>{row.action_bullet}</dd>
          </div>
        </dl>
      )}
    </article>
  );
}
```

- [ ] **Step 2: ResultsTable**

`web/components/results-table.tsx`:

```tsx
import { ResultRow } from "./result-row";
import type { ResultRow as Row } from "@/lib/types";

interface Props {
  rows: Row[];
  briefgenUrl: string;
  sortByScore?: boolean;
}

export function ResultsTable({ rows, briefgenUrl, sortByScore = false }: Props) {
  const sorted = sortByScore
    ? [...rows].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    : rows;
  return (
    <section aria-label="Account scoring results" className="space-y-3">
      {sorted.map((row) => (
        <ResultRow key={row.id} row={row} briefgenUrl={briefgenUrl} />
      ))}
    </section>
  );
}

export function summarize(rows: Row[]): {
  hot: number; warm: number; cool: number; pending: number; error: number;
} {
  let hot = 0, warm = 0, cool = 0, pending = 0, error = 0;
  for (const r of rows) {
    if (r.status === "pending") pending++;
    else if (r.status === "error") error++;
    else if ((r.score ?? 0) >= 8) hot++;
    else if ((r.score ?? 0) >= 5) warm++;
    else cool++;
  }
  return { hot, warm, cool, pending, error };
}
```

- [ ] **Step 3: Commit**

```bash
git add web/components/result-row.tsx web/components/results-table.tsx
git commit -m "feat(web): add ResultRow and ResultsTable"
```

---

### Task 24: HistorySidebar

**Files:**
- Create: `web/components/history-sidebar.tsx`

- [ ] **Step 1: Write**

`web/components/history-sidebar.tsx`:

```tsx
import Link from "next/link";
import type { BatchSummary } from "@/lib/types";

interface Props {
  batches: BatchSummary[];
  activeId?: string;
}

export function HistorySidebar({ batches, activeId }: Props) {
  return (
    <nav aria-label="Past batches" className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/50">
        Past Batches
      </h2>
      {batches.length === 0 ? (
        <p className="text-sm text-ink/50">No batches yet.</p>
      ) : (
        <ul className="space-y-1">
          {batches.map((b) => (
            <li key={b.id}>
              <Link
                href={{ pathname: `/batch/${b.id}` }}
                className={`block rounded-md px-3 py-2 text-sm hover:bg-ink/5 ${
                  activeId === b.id ? "bg-ink/5 font-medium" : ""
                }`}
              >
                {b.unique_count} accounts
                <span className="ml-2 text-ink/50">
                  {new Date(b.created_at).toLocaleDateString()}
                </span>
                {b.status === "running" ? (
                  <span className="ml-2 text-xs text-amber-600">running…</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/history-sidebar.tsx
git commit -m "feat(web): add HistorySidebar"
```

---

### Task 25: Main page

**Files:**
- Create: `web/app/page.tsx`

- [ ] **Step 1: Write**

`web/app/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { InputForm } from "@/components/input-form";
import { HistorySidebar } from "@/components/history-sidebar";
import { ResultsTable, summarize } from "@/components/results-table";
import { createBatch, fetchHistory } from "@/lib/api-client";
import { subscribeToBatch } from "@/lib/sse-client";
import type { BatchSummary, ResultRow } from "@/lib/types";

const BRIEFGEN_URL =
  process.env.NEXT_PUBLIC_BRIEFGEN_URL ?? "https://briefgen.partners.alkira.cc";

export default function Home() {
  const [history, setHistory] = useState<BatchSummary[]>([]);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    fetchHistory().then(setHistory).catch(console.error);
  }, []);

  async function handleSubmit(raw: string) {
    const { id } = await createBatch(raw);
    setCurrentBatchId(id);
    setRows([]);
    setAllDone(false);

    const sub = subscribeToBatch(id, (ev) => {
      if (ev.type === "pending") {
        setRows((prev) => [...prev, ev.row as ResultRow]);
      } else if (ev.type === "result") {
        setRows((prev) =>
          prev.map((r) => (r.id === ev.row?.id ? { ...r, ...(ev.row as ResultRow) } : r)),
        );
      } else if (ev.type === "done") {
        setAllDone(true);
        sub.close();
        fetchHistory().then(setHistory).catch(console.error);
      }
    });
  }

  const summary = summarize(rows);
  const completed = rows.length - summary.pending;

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="border-r border-ink/10 bg-white p-6">
        <h1 className="mb-6 text-lg font-bold">Account Radar</h1>
        <HistorySidebar batches={history} activeId={currentBatchId ?? undefined} />
      </aside>

      <main className="space-y-8 p-8">
        <header>
          <h2 className="text-2xl font-bold">Score your account list</h2>
          <p className="text-sm text-ink/60">
            Paste up to 40 company names. Each gets a 1–10 Alkira fit score and three bullets.
          </p>
        </header>

        <InputForm onSubmit={handleSubmit} disabled={!!currentBatchId && !allDone} />

        {rows.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm font-medium" aria-live="polite">
              {allDone
                ? `${rows.length} of ${rows.length} scored — ${summary.hot} hot (8+), ${summary.warm} warm (5–7), ${summary.cool} skip (1–4)`
                : `Scoring… ${completed} of ${rows.length} done`}
            </p>
            <ResultsTable rows={rows} briefgenUrl={BRIEFGEN_URL} sortByScore={allDone} />
          </div>
        ) : null}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/app/page.tsx
git commit -m "feat(web): wire main page with streaming results"
```

---

### Task 26: Historical batch page

**Files:**
- Create: `web/app/batch/[id]/page.tsx`

- [ ] **Step 1: Write**

`web/app/batch/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ResultsTable, summarize } from "@/components/results-table";
import type { Batch } from "@/lib/types";

const API_INTERNAL = process.env.RADAR_API_INTERNAL ?? "http://127.0.0.1:8601";
const BRIEFGEN_URL =
  process.env.NEXT_PUBLIC_BRIEFGEN_URL ?? "https://briefgen.partners.alkira.cc";

async function loadBatch(id: string, authEmail: string | null): Promise<Batch | null> {
  const res = await fetch(`${API_INTERNAL}/api/radar/batch/${encodeURIComponent(id)}`, {
    cache: "no-store",
    headers: authEmail ? { "X-Auth-Email": authEmail } : undefined,
  });
  if (res.status === 404 || res.status === 401) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await headers();
  const authEmail = h.get("x-auth-email");
  const batch = await loadBatch(id, authEmail);
  if (!batch) notFound();

  const summary = summarize(batch.results);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <Link href="/" className="text-sm text-accent hover:underline">← Back to new batch</Link>
      <header>
        <h1 className="text-2xl font-bold">Batch {batch.id.slice(0, 8)}</h1>
        <p className="text-sm text-ink/60">
          {batch.unique_count} accounts · {new Date(batch.created_at).toLocaleString()}
        </p>
        <p className="mt-2 text-sm font-medium">
          {summary.hot} hot (8+), {summary.warm} warm (5–7), {summary.cool} skip (1–4)
          {summary.error > 0 ? `, ${summary.error} errored` : ""}
        </p>
      </header>
      <ResultsTable rows={batch.results} briefgenUrl={BRIEFGEN_URL} sortByScore />
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/app/batch/
git commit -m "feat(web): add historical batch view"
```

---

### Task 27: Playwright E2E

**Files:**
- Create: `web/tests/e2e/flow.spec.ts`

- [ ] **Step 1: Write**

`web/tests/e2e/flow.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.describe("radar flow", () => {
  test.beforeEach(async ({ context }) => {
    await context.setExtraHTTPHeaders({ "X-Auth-Email": "partner@example.com" });
  });

  test("paste 3 accounts and see streaming results", async ({ page }) => {
    await page.goto("/");
    await page.locator("textarea#accounts").fill("Acme\nGlobex\nInitech");
    await page.getByRole("button", { name: /score accounts/i }).click();

    await expect(page.getByRole("status").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/of 3 done|3 of 3 scored/i)).toBeVisible({ timeout: 120_000 });

    const briefBtn = page.getByRole("link", { name: /generate brief/i }).first();
    await expect(briefBtn).toBeVisible();
    const href = await briefBtn.getAttribute("href");
    expect(href).toContain("briefgen.partners.alkira.cc");
    expect(href).toContain("company=");
  });

  test("41 accounts blocks with friendly error", async ({ page }) => {
    await page.goto("/");
    const big = Array.from({ length: 41 }, (_, i) => `Co${i}`).join("\n");
    await page.locator("textarea#accounts").fill(big);
    await page.getByRole("button", { name: /score accounts/i }).click();
    await expect(page.getByRole("alert")).toContainText(/40 or fewer/i);
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add web/tests/e2e/flow.spec.ts
git commit -m "test(web): add Playwright E2E for streaming flow and size cap"
```

---

### Task 28: Verify frontend builds and tests pass

- [ ] **Step 1: Run unit tests**

```bash
cd web && npm test
```

Expected: all parse-input, score-color, sse-client tests pass.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: No commit (verification only)**

---

## Phase 5 — Deployment

### Task 29: Dockerfiles + docker-compose

**Files:**
- Create: `api/Dockerfile`
- Create: `web/Dockerfile`
- Create: `docker-compose.yml`

- [ ] **Step 1: `api/Dockerfile`**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY radar ./radar
ENV PYTHONUNBUFFERED=1
EXPOSE 8601
CMD ["uvicorn", "radar.api:app", "--host", "127.0.0.1", "--port", "8601", "--workers", "1"]
```

- [ ] **Step 2: `web/Dockerfile`**

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
```

- [ ] **Step 3: `docker-compose.yml`**

```yaml
services:
  radar-api:
    build: ./api
    env_file: .env
    network_mode: host
    restart: unless-stopped

  radar-web:
    build: ./web
    env_file: .env
    network_mode: host
    restart: unless-stopped
```

- [ ] **Step 4: Commit**

```bash
git add api/Dockerfile web/Dockerfile docker-compose.yml
git commit -m "chore(deploy): add Dockerfiles and docker-compose"
```

---

### Task 30: nginx config

**Files:**
- Create: `deploy/nginx/radar.partners.alkira.cc.conf`

- [ ] **Step 1: Write**

```nginx
server {
  listen 443 ssl http2;
  server_name radar.partners.alkira.cc;

  ssl_certificate     /etc/letsencrypt/live/radar.partners.alkira.cc/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/radar.partners.alkira.cc/privkey.pem;

  proxy_set_header X-Auth-Email "";

  auth_request /auth-check;
  auth_request_set $auth_email $upstream_http_x_auth_email;
  proxy_set_header X-Auth-Email $auth_email;

  location = /auth-check {
    internal;
    proxy_pass http://127.0.0.1:3461/check;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header X-Original-URI $request_uri;
  }

  error_page 401 = @redirect_to_auth;
  location @redirect_to_auth {
    return 302 /auth.html?next=$request_uri;
  }

  location = /auth.html  { root /var/www/briefgen; }
  location = /admin.html { root /var/www/briefgen; auth_request off; }

  location /api/auth/ {
    auth_request off;
    proxy_pass http://127.0.0.1:3461;
  }

  location /api/radar/ {
    proxy_pass http://127.0.0.1:8601;
    proxy_buffering off;
    proxy_read_timeout 600s;
    proxy_http_version 1.1;
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}

server {
  listen 80;
  server_name radar.partners.alkira.cc;
  return 301 https://$host$request_uri;
}
```

- [ ] **Step 2: Commit**

```bash
git add deploy/nginx/radar.partners.alkira.cc.conf
git commit -m "chore(deploy): nginx config for radar subdomain with shared auth"
```

---

### Task 31: systemd units (alternative to docker-compose)

**Files:**
- Create: `deploy/systemd/radar-api.service`
- Create: `deploy/systemd/radar-web.service`

- [ ] **Step 1: API unit**

```ini
[Unit]
Description=Alkira Radar FastAPI
After=network.target

[Service]
Type=simple
User=radar
WorkingDirectory=/opt/radar/api
EnvironmentFile=/opt/radar/.env
ExecStart=/opt/radar/api/.venv/bin/uvicorn radar.api:app --host 127.0.0.1 --port 8601 --workers 1
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: Web unit**

```ini
[Unit]
Description=Alkira Radar Next.js
After=network.target

[Service]
Type=simple
User=radar
WorkingDirectory=/opt/radar/web
EnvironmentFile=/opt/radar/.env
ExecStart=/usr/bin/npm start --prefix /opt/radar/web
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 3: Commit**

```bash
git add deploy/systemd/
git commit -m "chore(deploy): add systemd units as docker-compose alternative"
```

---

### Task 32: SETUP.md

**Files:**
- Create: `SETUP.md`

- [ ] **Step 1: Write**

```markdown
# Setup

## Prereqs

- Python 3.11+
- Node 22+
- Access to the shared Supabase project used by brief-gen
- Anthropic API key with Managed Agents beta access
- Skill IDs from brief-gen: `ALKIRA_CUSTOMER_SKILL_ID`, `STOP_SLOP_SKILL_ID`

## First-time setup

```bash
cp .env.example .env
# Fill in ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
# ALKIRA_CUSTOMER_SKILL_ID, STOP_SLOP_SKILL_ID
```

### Apply the database migration

```bash
supabase db push --file supabase/migrations/20260518_radar_tables.sql
```

### Upload the rubric skill and create the agent

```bash
cd api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m radar.setup_skills    # populates ALKIRA_RADAR_RUBRIC_SKILL_ID
python -m radar.setup_agent     # populates ALKIRA_RADAR_AGENT_ID + ALKIRA_RADAR_ENV_ID
```

### Install frontend deps

```bash
cd ../web && npm install
```

## Local dev

```bash
# Terminal 1
cd api && source .venv/bin/activate
uvicorn radar.api:app --host 127.0.0.1 --port 8601 --reload

# Terminal 2
cd web && npm run dev
```

Open http://localhost:3000. Locally, auth is bypassed — pass `X-Auth-Email: dev@example.com` via curl or browser extension to exercise endpoints.

## Production deploy

### Docker Compose

```bash
docker compose up -d --build
sudo cp deploy/nginx/radar.partners.alkira.cc.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/radar.partners.alkira.cc.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d radar.partners.alkira.cc
```

### systemd

```bash
sudo cp deploy/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now radar-api radar-web
# Same nginx + certbot steps as above
```

## Tests

```bash
cd api && pytest --cov=radar -v
cd ../web && npm test
npm run e2e  # requires running stack
```
```

- [ ] **Step 2: Commit**

```bash
git add SETUP.md
git commit -m "docs: add SETUP.md"
```

---

### Task 33: Final verification

- [ ] **Step 1: Backend coverage**

```bash
cd api && pytest --cov=radar --cov-report=term-missing
```

Expected: all pass, `radar/` coverage ≥ 80%.

- [ ] **Step 2: Frontend unit tests**

```bash
cd web && npm test
```

Expected: all pass.

- [ ] **Step 3: Full-stack smoke test**

```bash
docker compose up --build
```

In another terminal:

```bash
curl -X POST http://127.0.0.1:8601/api/radar/run \
  -H "X-Auth-Email: dev@example.com" \
  -H "Content-Type: application/json" \
  -d '{"raw":"Acme\nGlobex\nInitech"}'
```

Expected: returns `{"id": "...", "input_count": 3, "unique_count": 3, "status": "running", ...}`.

```bash
curl -N -H "X-Auth-Email: dev@example.com" \
  http://127.0.0.1:8601/api/radar/run/<batch-id>
```

Expected: SSE stream emits `pending` events, then `result` events, then `done`.

- [ ] **Step 4: UI smoke test**

Visit http://localhost:3000 (with a browser extension or proxy that injects `X-Auth-Email: dev@example.com`). Paste 3 names → confirm streaming results, then click "Generate brief" and verify the href targets `briefgen.partners.alkira.cc/?company=...&domain=...`.

- [ ] **Step 5: Confirm Supabase rows**

In Supabase dashboard, confirm `radar_batches` has the test batch and `radar_results` has 3 rows with scores and bullets.

- [ ] **Step 6: No commit (verification only). Fix and commit normally if anything fails.**

---

## Out of Scope (per spec section 14)

These do NOT belong in this plan:

- Multi-tenant org structure
- Re-scoring an existing batch in place
- Persistent agent memory across batches
- Slack or email notifications when a batch completes
- CSV upload (textarea paste only)
- Cross-batch dedup ("you scored Acme last week")
- Partner-configurable scoring weights

## Sibling Coordination

Per spec section 15, a separate small change is needed in CLEAR-brief-gen to accept `?company=...&domain=...` query params and prefill its form. Tracked as a sibling issue in that repo, not part of this plan. Radar ships fine without it — the handoff link lands on brief-gen's empty form until that change merges.

---

## Self-Review

**Spec coverage:**
- Spec §1 Purpose → entire plan
- §2 Why this exists → README + SETUP.md
- §3 Architecture → Tasks 11, 29, 30
- §4 Data model → Task 2
- §5 Agent + skills → Tasks 12-15
- §6 Scoring rubric → Task 13
- §7 Output contract → Task 5 (Pydantic) + Task 17 (TS types)
- §8 User flow → Tasks 22, 25, 26
- §9 Edge cases → Tasks 4 (parser), 9 (orchestrator), 11 (API caps)
- §10 Cost guardrails → Task 11 daily limit + env var
- §11 Deployment → Tasks 29-31
- §12 Repo layout → file structure section + every Phase 4/5 task
- §13 Testing → Tasks 4-11, 18-20, 27, 33
- §14 Out of scope → documented above
- §15 Brief-gen coordination → documented above
- §16 Success criteria → Task 33

**Placeholders:** none. Every code block contains real code.

**Type consistency:**
- `AgentOutput` Pydantic fields match `ResultRow` TS fields (snake_case preserved across the wire).
- Parser behavior matches between Python `parser.py` and TS `parse-input.ts` (mirrored test cases enforce this).
- `SSEEvent` shape matches between Python (Task 5) and TypeScript (Task 17).
- `ScoreBadge`, `ResultRow`, `ResultsTable.summarize` use consistent score-band boundaries: hot ≥ 8, warm ≥ 5, cool < 5 (matches spec §10 summary header).
