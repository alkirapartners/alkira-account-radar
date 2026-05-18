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
