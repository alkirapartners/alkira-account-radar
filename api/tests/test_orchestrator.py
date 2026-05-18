from unittest.mock import AsyncMock, MagicMock
import pytest
from radar.orchestrator import RadarOrchestrator
from radar.schemas import AgentOutput
from radar.sse import EventBus


def _ok(name: str, score: int = 8) -> AgentOutput:
    return AgentOutput(
        resolved_name=f"{name} Corp", resolved_domain=f"{name.lower()}.com",
        score=score, fit_bullet="fit", objection_bullet="obj", action_bullet="act",
        sources=["https://x"],
    )


@pytest.mark.asyncio
async def test_runs_all_and_emits_events():
    agent = MagicMock()
    agent.score_account = AsyncMock(side_effect=[(_ok("Acme"), "r1"), (_ok("Globex", 6), "r2")])
    repo = MagicMock()
    repo.insert_pending_results.return_value = [
        {"id": "r1", "account_name": "Acme"}, {"id": "r2", "account_name": "Globex"},
    ]
    bus = EventBus()
    orch = RadarOrchestrator(agent=agent, repo=repo, bus=bus, concurrency=2)
    sub = bus.subscribe("b1")
    await orch.run("b1", ["Acme", "Globex"])
    events = [e async for e in sub]
    types = [e.type for e in events]
    assert types.count("pending") == 2
    assert types.count("result") == 2
    assert types.count("done") == 1
    repo.complete_batch.assert_called_once_with("b1", status="done")


@pytest.mark.asyncio
async def test_failure_does_not_block_other_rows():
    agent = MagicMock()
    agent.score_account = AsyncMock(side_effect=[Exception("boom"), (_ok("Globex"), "r2")])
    repo = MagicMock()
    repo.insert_pending_results.return_value = [
        {"id": "r1", "account_name": "Acme"}, {"id": "r2", "account_name": "Globex"},
    ]
    bus = EventBus()
    orch = RadarOrchestrator(agent=agent, repo=repo, bus=bus, concurrency=2)
    sub = bus.subscribe("b1")
    await orch.run("b1", ["Acme", "Globex"])
    events = [e async for e in sub]
    errors = [e for e in events if e.type == "result" and e.row.get("status") == "error"]
    oks = [e for e in events if e.type == "result" and e.row.get("status") == "done"]
    assert len(errors) == 1 and len(oks) == 1
    repo.update_result_error.assert_called_once()
