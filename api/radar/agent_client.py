from __future__ import annotations
import asyncio
import os
from typing import Optional
from radar.schemas import AgentOutput


class AgentError(RuntimeError):
    pass


_TERMINAL_EVENT_TYPES = frozenset({
    "session.status_idle",
    "session.status_terminated",
    "session.error",
})


def _extract_event_text(event) -> str:
    parts: list[str] = []
    for block in getattr(event, "content", []) or []:
        if isinstance(block, dict):
            if block.get("type") == "text":
                parts.append(block.get("text", ""))
        elif getattr(block, "type", None) == "text":
            parts.append(getattr(block, "text", ""))
    return "".join(parts)


def _parse(text: str) -> AgentOutput:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.startswith("json\n"):
            stripped = stripped[5:]
    return AgentOutput.model_validate_json(stripped)


class AgentClient:
    """Async wrapper around the Anthropic Managed Agents sessions API with one retry.

    Each call to score_account creates a session, sends the account name as a
    user.message event, and streams session events until the agent reports
    session.status.idle. The concatenated text from agent.message events is
    parsed as JSON into AgentOutput.
    """

    def __init__(self, anthropic, agent_id: str, env_id: str, retry_delay: float = 5.0):
        self.anthropic = anthropic
        self.agent_id = agent_id
        self.env_id = env_id
        self.retry_delay = retry_delay

    async def score_account(self, account_name: str) -> tuple[AgentOutput, str]:
        last_err: Optional[Exception] = None
        for attempt in (1, 2):
            try:
                session = await self.anthropic.beta.sessions.create(
                    agent=self.agent_id,
                    environment_id=self.env_id,
                )
                await self.anthropic.beta.sessions.events.send(
                    session_id=session.id,
                    events=[{
                        "type": "user.message",
                        "content": [{"type": "text", "text": account_name}],
                    }],
                )
                text = await self._collect_agent_text(session.id)
                return _parse(text), session.id
            except Exception as e:
                last_err = e
                if attempt == 1 and self.retry_delay > 0:
                    await asyncio.sleep(self.retry_delay)
        raise AgentError(f"Agent failed after retry: {last_err}") from last_err

    async def _collect_agent_text(self, session_id: str) -> str:
        chunks: list[str] = []
        stream = await self.anthropic.beta.sessions.events.stream(session_id=session_id)
        try:
            async for event in stream:
                etype = getattr(event, "type", None)
                if etype == "agent.message":
                    chunks.append(_extract_event_text(event))
                elif etype in _TERMINAL_EVENT_TYPES:
                    break
        finally:
            close = getattr(stream, "close", None)
            if callable(close):
                result = close()
                if asyncio.iscoroutine(result):
                    await result
        if not chunks:
            raise AgentError("Agent session produced no text response")
        return "".join(chunks)


def make_client_from_env(anthropic) -> AgentClient:
    return AgentClient(
        anthropic=anthropic,
        agent_id=os.environ["ALKIRA_RADAR_AGENT_ID"],
        env_id=os.environ["ALKIRA_RADAR_ENV_ID"],
    )
