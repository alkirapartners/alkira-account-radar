import pytest
from pydantic import ValidationError
from radar.schemas import AgentOutput, BatchCreateRequest, SSEEvent


def test_agent_output_happy_path():
    out = AgentOutput.model_validate({
        "resolved_name": "Acme Corp",
        "resolved_domain": "acme.com",
        "score": 8,
        "fit_bullet": "Strong multicloud signal.",
        "objection_bullet": "Recent Aviatrix contract.",
        "action_bullet": "Lead with EMEA backbone angle.",
        "sources": ["https://acme.com/press"],
    })
    assert out.score == 8
    assert out.status == "ok"


def test_agent_output_not_found():
    out = AgentOutput.model_validate({
        "resolved_name": None,
        "resolved_domain": None,
        "score": None,
        "status": "not_found",
        "error_message": "No public information found.",
        "sources": [],
    })
    assert out.status == "not_found"
    assert out.score is None


def test_agent_output_score_out_of_range():
    with pytest.raises(ValidationError):
        AgentOutput.model_validate({
            "resolved_name": "Acme",
            "resolved_domain": "acme.com",
            "score": 11,
            "fit_bullet": "x",
            "objection_bullet": "x",
            "action_bullet": "x",
            "sources": [],
        })


def test_agent_output_ok_requires_bullets():
    with pytest.raises(ValidationError):
        AgentOutput.model_validate({
            "resolved_name": "Acme",
            "resolved_domain": "acme.com",
            "score": 8,
            "sources": [],
        })


def test_batch_create_request():
    req = BatchCreateRequest(raw="Acme\nGlobex")
    assert req.raw == "Acme\nGlobex"


def test_sse_event_payload():
    ev = SSEEvent(
        type="result",
        batch_id="11111111-1111-1111-1111-111111111111",
        index=0,
        row={"account_name": "Acme", "status": "done", "score": 8},
    )
    payload = ev.to_sse_payload()
    assert payload.startswith("data: ")
    assert payload.endswith("\n\n")
    assert '"type": "result"' in payload
