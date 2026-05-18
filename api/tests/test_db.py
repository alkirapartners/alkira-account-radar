from unittest.mock import MagicMock
import pytest
from radar import db


@pytest.fixture
def fake_supabase():
    client = MagicMock()
    client.postgrest.session = MagicMock()
    client.postgrest.session.headers = {}
    return client


def test_create_batch(fake_supabase, partner_email):
    fake_supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "b1", "partner_email": partner_email, "input_count": 2, "unique_count": 2,
         "status": "running", "created_at": "2026-05-18T00:00:00Z"}
    ]
    repo = db.RadarRepo(fake_supabase)
    batch = repo.create_batch(
        partner_email=partner_email, input_raw="Acme\nGlobex",
        input_count=2, unique_count=2,
    )
    assert batch["id"] == "b1"
    fake_supabase.table.assert_called_with("radar_batches")


def test_insert_pending_results(fake_supabase):
    fake_supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "r1", "account_name": "Acme", "batch_id": "b1", "status": "pending"},
        {"id": "r2", "account_name": "Globex", "batch_id": "b1", "status": "pending"},
    ]
    repo = db.RadarRepo(fake_supabase)
    rows = repo.insert_pending_results("b1", ["Acme", "Globex"])
    assert len(rows) == 2
    assert rows[0]["account_name"] == "Acme"


def test_update_result_done(fake_supabase):
    repo = db.RadarRepo(fake_supabase)
    repo.update_result_done(
        result_id="r1",
        resolved_name="Acme Corp", resolved_domain="acme.com", score=8,
        fit_bullet="x", objection_bullet="x", action_bullet="x",
        sources=["https://acme.com"], agent_run_id="run_123",
    )
    fake_supabase.table.return_value.update.assert_called()


def test_count_batches_today(fake_supabase, partner_email):
    fake_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.execute.return_value.count = 3
    repo = db.RadarRepo(fake_supabase)
    assert repo.count_batches_today(partner_email) == 3
