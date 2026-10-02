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


def _updated_columns(fake_supabase) -> dict:
    return fake_supabase.table.return_value.update.call_args.args[0]


def test_update_result_done_stores_reasons_in_the_three_bullet_columns(fake_supabase):
    repo = db.RadarRepo(fake_supabase)

    repo.update_result_done(
        result_id="r1", resolved_name="Acme Corp", resolved_domain="acme.com",
        score=8, reasons=["one", "two", "three"], run_id="msg_123",
    )

    written = _updated_columns(fake_supabase)
    assert written["status"] == "done"
    assert written["score"] == 8
    assert written["fit_bullet"] == "one"
    assert written["objection_bullet"] == "two"
    assert written["action_bullet"] == "three"
    assert written["agent_run_id"] == "msg_123"


def test_update_result_done_with_no_reasons_nulls_the_bullet_columns(fake_supabase):
    repo = db.RadarRepo(fake_supabase)

    repo.update_result_done(
        result_id="r1", resolved_name=None, resolved_domain=None,
        score=None, reasons=[], run_id="msg_123",
    )

    written = _updated_columns(fake_supabase)
    assert written["score"] is None
    assert written["fit_bullet"] is None
    assert written["objection_bullet"] is None
    assert written["action_bullet"] is None


def test_get_results_returns_reasons_instead_of_bullet_columns(fake_supabase, partner_email):
    fake_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "r1", "account_name": "Acme", "status": "done", "score": 8,
         "fit_bullet": "one", "objection_bullet": "two", "action_bullet": "three"},
        {"id": "r2", "account_name": "Zzyx", "status": "done", "score": None,
         "fit_bullet": None, "objection_bullet": None, "action_bullet": None},
    ]
    repo = db.RadarRepo(fake_supabase)

    rows = repo.get_results("b1", partner_email)

    assert rows[0]["reasons"] == ["one", "two", "three"]
    assert rows[1]["reasons"] == []
    assert "fit_bullet" not in rows[0]


def test_count_batches_today(fake_supabase, partner_email):
    fake_supabase.table.return_value.select.return_value.eq.return_value.gte.return_value.execute.return_value.count = 3
    repo = db.RadarRepo(fake_supabase)
    assert repo.count_batches_today(partner_email) == 3
