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
