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
        betas=["managed-agents-2026-04-01", "skills-2025-10-02"],
    )
    print(f"  Agent ID: {agent.id}")

    print("Creating environment...")
    environment = client.beta.environments.create(
        name="alkira-radar-env",
        config={"type": "cloud", "networking": {"type": "unrestricted"}},
        betas=["managed-agents-2026-04-01"],
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
