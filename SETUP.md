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
