import json
from unittest.mock import AsyncMock, MagicMock
import pytest
from radar.agent_client import AgentClient, AgentError


class _FakeAsyncStream:
    """Mimic anthropic AsyncStream — supports async iteration and close()."""

    def __init__(self, events):
        self._events = list(events)
        self.closed = False

    def __aiter__(self):
        async def _gen():
            for e in self._events:
                yield e
        return _gen()

    async def close(self):
        self.closed = True


def _agent_message(text: str):
    return MagicMock(
        type="agent.message",
        content=[MagicMock(type="text", text=text)],
    )


def _idle():
    return MagicMock(type="session.status_idle")


def _make_fake(*event_streams):
    """Build a fake AsyncAnthropic whose stream() yields each provided list in order."""
    fake = MagicMock()
    fake.beta.sessions.create = AsyncMock(
        side_effect=[MagicMock(id=f"sess_{i}") for i in range(len(event_streams))]
    )
    fake.beta.sessions.events.send = AsyncMock(return_value=MagicMock(data=[]))
    fake.beta.sessions.events.stream = AsyncMock(
        side_effect=[_FakeAsyncStream(events) for events in event_streams]
    )
    return fake


@pytest.mark.asyncio
async def test_score_account_happy():
    payload = json.dumps({
        "resolved_name": "Acme Corp",
        "resolved_domain": "acme.com",
        "score": 8,
        "fit_bullet": "x", "objection_bullet": "y", "action_bullet": "z",
        "sources": ["https://acme.com"],
    })
    fake = _make_fake([_agent_message(payload), _idle()])
    client = AgentClient(anthropic=fake, agent_id="a", env_id="e", retry_delay=0)
    out, session_id = await client.score_account("Acme")
    assert out.score == 8
    assert session_id == "sess_0"
    fake.beta.sessions.create.assert_awaited_once_with(agent="a", environment_id="e")
    fake.beta.sessions.events.send.assert_awaited_once()
    send_kwargs = fake.beta.sessions.events.send.call_args.kwargs
    assert send_kwargs["session_id"] == "sess_0"
    assert send_kwargs["events"][0]["type"] == "user.message"
    assert send_kwargs["events"][0]["content"][0]["text"] == "Acme"


@pytest.mark.asyncio
async def test_score_account_retries_once_on_parse():
    good = json.dumps({
        "resolved_name": "Acme", "resolved_domain": "acme.com", "score": 7,
        "fit_bullet": "x", "objection_bullet": "y", "action_bullet": "z",
        "sources": [],
    })
    fake = _make_fake(
        [_agent_message("not json"), _idle()],
        [_agent_message(good), _idle()],
    )
    client = AgentClient(anthropic=fake, agent_id="a", env_id="e", retry_delay=0)
    out, _ = await client.score_account("Acme")
    assert out.score == 7
    assert fake.beta.sessions.create.await_count == 2


@pytest.mark.asyncio
async def test_score_account_raises_after_second_failure():
    fake = _make_fake(
        [_agent_message("still not json"), _idle()],
        [_agent_message("still not json"), _idle()],
    )
    client = AgentClient(anthropic=fake, agent_id="a", env_id="e", retry_delay=0)
    with pytest.raises(AgentError):
        await client.score_account("Acme")


@pytest.mark.asyncio
async def test_score_account_raises_when_no_text_emitted():
    fake = _make_fake([_idle()], [_idle()])
    client = AgentClient(anthropic=fake, agent_id="a", env_id="e", retry_delay=0)
    with pytest.raises(AgentError):
        await client.score_account("Acme")
