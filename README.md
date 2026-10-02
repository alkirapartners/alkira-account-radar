# Alkira Account Radar

Partner-facing tool that scores up to 40 accounts at a time for Alkira fit. Sibling to [CLEAR-brief-gen](https://github.com/alkirapartners/CLEAR-brief-gen).

## Layout

- `api/` — FastAPI backend; scores each account with one direct Claude call
- `api/radar/reference/` — Scoring rubric and Alkira knowledge base inlined into the prompt
- `web/` — Next.js frontend
- `supabase/` — Database migrations
- `deploy/` — nginx + systemd configs
- `docs/` — Design specs and implementation plans

## Setup

See `SETUP.md`.
