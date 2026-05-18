from unittest.mock import AsyncMock, MagicMock
import pytest
from fastapi.testclient import TestClient
from radar.api import build_app


@pytest.fixture
def harness():
    repo = MagicMock()
    repo.create_batch.return_value = {
        "id": "b1", "input_count": 2, "unique_count": 2,
        "status": "running", "created_at": "2026-05-18T00:00:00Z",
    }
    repo.count_batches_today.return_value = 0
    repo.list_batches.return_value = []
    repo.get_batch.return_value = {
        "id": "b1", "input_count": 2, "unique_count": 2, "status": "done",
        "created_at": "2026-05-18T00:00:00Z", "completed_at": None,
    }
    repo.get_results.return_value = []
    orch = MagicMock(); orch.run = AsyncMock()
    app = build_app(
        repo_factory=lambda: repo,
        orchestrator_factory=lambda r: orch,
    )
    return TestClient(app), repo, orch


def test_run_requires_auth(harness):
    tc, _, _ = harness
    resp = tc.post("/api/radar/run", json={"raw": "Acme\nGlobex"})
    assert resp.status_code == 401


def test_run_creates_batch_and_kicks_orchestrator(harness):
    tc, repo, orch = harness
    resp = tc.post("/api/radar/run", json={"raw": "Acme\nGlobex"},
                   headers={"X-Auth-Email": "p@x.com"})
    assert resp.status_code == 200
    assert resp.json()["id"] == "b1"
    repo.create_batch.assert_called_once()
    orch.run.assert_called_once()


def test_run_blocks_daily_cap(harness):
    tc, repo, _ = harness
    repo.count_batches_today.return_value = 5
    resp = tc.post("/api/radar/run", json={"raw": "Acme"},
                   headers={"X-Auth-Email": "p@x.com"})
    assert resp.status_code == 429


def test_run_blocks_oversize(harness):
    tc, _, _ = harness
    big = "\n".join(f"Co{i}" for i in range(41))
    resp = tc.post("/api/radar/run", json={"raw": big},
                   headers={"X-Auth-Email": "p@x.com"})
    assert resp.status_code == 400
    assert "40 or fewer" in resp.json()["detail"]


def test_history_returns_partner_batches(harness):
    tc, repo, _ = harness
    repo.list_batches.return_value = [{"id": "b1", "input_count": 2, "unique_count": 2,
                                       "status": "done", "created_at": "2026-05-18T00:00:00Z"}]
    resp = tc.get("/api/radar/history", headers={"X-Auth-Email": "p@x.com"})
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_get_batch_404_when_rls_hides(harness):
    tc, repo, _ = harness
    repo.get_batch.return_value = None
    resp = tc.get("/api/radar/batch/b1", headers={"X-Auth-Email": "p@x.com"})
    assert resp.status_code == 404
