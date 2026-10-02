import pytest
from pydantic import ValidationError
from radar.schemas import BatchCreateRequest, ResultRow, ScoreOutput, SSEEvent


def _scored(**overrides) -> dict:
    return {
        "recognized": True,
        "resolved_name": "Acme Corp",
        "resolved_domain": "acme.com",
        "score": 8,
        "reasons": ["Multicloud footprint.", "Frequent acquisitions.", "Hundreds of sites."],
        **overrides,
    }


def test_score_output_happy_path():
    out = ScoreOutput.model_validate(_scored())

    assert out.score == 8
    assert len(out.reasons) == 3


def test_score_output_unrecognized_needs_no_score_or_reasons():
    out = ScoreOutput.model_validate({"recognized": False})

    assert out.score is None
    assert out.reasons == []


def test_score_output_rejects_score_out_of_range():
    with pytest.raises(ValidationError):
        ScoreOutput.model_validate(_scored(score=11))


def test_score_output_recognized_requires_a_score():
    with pytest.raises(ValidationError):
        ScoreOutput.model_validate(_scored(score=None))


@pytest.mark.parametrize("reasons", [[], ["one", "two"], ["one", "two", "three", "four"]])
def test_score_output_recognized_requires_exactly_three_reasons(reasons):
    with pytest.raises(ValidationError):
        ScoreOutput.model_validate(_scored(reasons=reasons))


def test_score_output_rejects_blank_reasons():
    with pytest.raises(ValidationError):
        ScoreOutput.model_validate(_scored(reasons=["one", "  ", "three"]))


def test_result_row_defaults_to_no_reasons():
    row = ResultRow(id="r1", account_name="Acme")

    assert row.reasons == []
    assert row.status == "pending"


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
