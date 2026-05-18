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
