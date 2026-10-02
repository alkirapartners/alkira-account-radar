from unittest.mock import AsyncMock, MagicMock
import pytest
from radar.orchestrator import RadarOrchestrator
from radar.schemas import ScoreOutput
from radar.sse import EventBus

REASONS = ["Multicloud footprint.", "Frequent acquisitions.", "Hundreds of sites."]


def _ok(name: str, score: int = 8) -> ScoreOutput:
    return ScoreOutput(
        recognized=True, resolved_name=f"{name} Corp", resolved_domain=f"{name.lower()}.com",
        score=score, reasons=REASONS,
    )


def _two_row_repo() -> MagicMock:
    repo = MagicMock()
    repo.insert_pending_results.return_value = [
        {"id": "r1", "account_name": "Acme"}, {"id": "r2", "account_name": "Globex"},
    ]
    return repo


async def _run(scorer, repo) -> list:
    bus = EventBus()
    orch = RadarOrchestrator(scorer=scorer, repo=repo, bus=bus, concurrency=2)
    sub = bus.subscribe("b1")
    await orch.run("b1", ["Acme", "Globex"])
    return [e async for e in sub]


def _results(events: list) -> list[dict]:
    return [e.row for e in events if e.type == "result"]


@pytest.mark.asyncio
async def test_runs_all_and_emits_events():
    scorer = MagicMock()
    scorer.score_account = AsyncMock(side_effect=[(_ok("Acme"), "m1"), (_ok("Globex", 6), "m2")])
    repo = _two_row_repo()

    events = await _run(scorer, repo)

    types = [e.type for e in events]
    assert types.count("pending") == 2
    assert types.count("result") == 2
    assert types.count("done") == 1
    repo.complete_batch.assert_called_once_with("b1", status="done")


@pytest.mark.asyncio
async def test_scored_row_streams_and_persists_its_three_reasons():
    scorer = MagicMock()
    scorer.score_account = AsyncMock(side_effect=[(_ok("Acme"), "m1"), (_ok("Globex", 6), "m2")])
    repo = _two_row_repo()

    events = await _run(scorer, repo)

    acme = next(r for r in _results(events) if r["id"] == "r1")
    assert acme["status"] == "done"
    assert acme["score"] == 8
    assert acme["reasons"] == REASONS
    repo.update_result_done.assert_any_call(
        result_id="r1", resolved_name="Acme Corp", resolved_domain="acme.com",
        score=8, reasons=REASONS, run_id="m1",
    )


@pytest.mark.asyncio
async def test_unrecognized_company_is_done_with_no_score_not_an_error():
    scorer = MagicMock()
    scorer.score_account = AsyncMock(
        side_effect=[(ScoreOutput(recognized=False), "m1"), (_ok("Globex"), "m2")]
    )
    repo = _two_row_repo()

    events = await _run(scorer, repo)

    unknown = next(r for r in _results(events) if r["id"] == "r1")
    assert unknown["status"] == "done"
    assert unknown["score"] is None
    assert unknown["reasons"] == []
    repo.update_result_error.assert_not_called()
    repo.update_result_done.assert_any_call(
        result_id="r1", resolved_name=None, resolved_domain=None,
        score=None, reasons=[], run_id="m1",
    )


@pytest.mark.asyncio
async def test_failure_does_not_block_other_rows():
    scorer = MagicMock()
    scorer.score_account = AsyncMock(side_effect=[Exception("boom"), (_ok("Globex"), "m2")])
    repo = _two_row_repo()

    events = await _run(scorer, repo)

    errors = [r for r in _results(events) if r.get("status") == "error"]
    oks = [r for r in _results(events) if r.get("status") == "done"]
    assert len(errors) == 1 and len(oks) == 1
    repo.update_result_error.assert_called_once()
