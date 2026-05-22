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

Radar mounts under `/radar` on the same `briefgen.partners.alkira.cc` host
as brief-gen. It piggybacks on brief-gen's nginx, TLS cert, and auth proxy.
No separate subdomain or certbot run is needed.

### On the shared EC2 host (first-time install)

```bash
sudo git clone https://github.com/blake-hays/alkira-account-radar.git /opt/radar
# scp your local .env to /opt/radar/.env first
sudo chown -R radar:radar /opt/radar
cd /opt/radar

# Option A — Docker Compose
sudo docker compose up -d --build

# Option B — systemd
sudo cp deploy/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now radar-api radar-web
```

### Nginx (lives in the brief-gen repo, not here)

Add two `location` blocks inside brief-gen's existing
`briefgen.partners.alkira.cc` server block, above the catch-all `location /`,
so they inherit the existing `auth_request /auth-check`:

```nginx
location /api/radar/ {
  proxy_pass http://127.0.0.1:8601;
  proxy_buffering off;
  proxy_read_timeout 600s;
  proxy_http_version 1.1;
}

location /radar/ {
  proxy_pass http://127.0.0.1:3001;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
```

Then: `sudo nginx -t && sudo systemctl reload nginx`.

### Auto-update

Extend brief-gen's existing deploy hook to also pull and restart radar:

```bash
cd /opt/radar && git pull --ff-only
sudo systemctl restart radar-api radar-web
# OR with docker compose:
cd /opt/radar && git pull --ff-only && sudo docker compose up -d --build
```

## Tests

```bash
cd api && pytest --cov=radar -v
cd ../web && npm test
npm run e2e  # requires running stack
```
