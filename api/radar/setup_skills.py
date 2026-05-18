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
