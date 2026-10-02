import json
from unittest.mock import AsyncMock, MagicMock
import pytest
from radar import prompts
from radar.scorer import MODEL, AccountScorer, ScoringError


def _text(text: str):
    return MagicMock(type="text", text=text)


def _message(*blocks, stop_reason: str = "end_turn", message_id: str = "msg_1"):
    return MagicMock(id=message_id, stop_reason=stop_reason, content=list(blocks))


def _scored(score: int = 8, reasons: list[str] | None = None) -> str:
    return json.dumps({
        "recognized": True,
        "resolved_name": "Acme Corporation",
        "resolved_domain": "acme.com",
        "score": score,
        "reasons": reasons if reasons is not None else ["one", "two", "three"],
    })


def _fake_anthropic(*messages):
    fake = MagicMock()
    fake.messages.create = AsyncMock(side_effect=list(messages))
    return fake


async def test_returns_score_reasons_and_message_id_for_recognized_company():
    fake = _fake_anthropic(_message(_text(_scored(score=8)), message_id="msg_abc"))

    output, run_id = await AccountScorer(fake).score_account("Acme")

    assert output.recognized is True
    assert output.score == 8
    assert output.reasons == ["one", "two", "three"]
    assert output.resolved_name == "Acme Corporation"
    assert run_id == "msg_abc"


async def test_scores_in_one_direct_call_with_no_tools():
    fake = _fake_anthropic(_message(_text(_scored())))

    await AccountScorer(fake).score_account("Acme")

    fake.messages.create.assert_awaited_once()
    kwargs = fake.messages.create.call_args.kwargs
    assert kwargs["model"] == MODEL
    assert "tools" not in kwargs


async def test_sends_cached_reference_prefix_and_account_name():
    fake = _fake_anthropic(_message(_text(_scored())))

    await AccountScorer(fake).score_account("Globex Industries")

    kwargs = fake.messages.create.call_args.kwargs
    system_block = kwargs["system"][0]
    assert system_block["text"] == prompts.build_system_prefix()
    assert system_block["cache_control"] == {"type": "ephemeral"}
    assert "Globex Industries" in kwargs["messages"][0]["content"]
    assert "Globex Industries" not in system_block["text"]


async def test_requests_json_matching_the_score_schema():
    fake = _fake_anthropic(_message(_text(_scored())))

    await AccountScorer(fake).score_account("Acme")

    output_format = fake.messages.create.call_args.kwargs["output_config"]["format"]
    assert output_format["type"] == "json_schema"
    assert set(output_format["schema"]["required"]) == {
        "recognized", "resolved_name", "resolved_domain", "score", "reasons",
    }


async def test_ignores_thinking_blocks_before_the_json():
    thinking = MagicMock(type="thinking", thinking="")
    fake = _fake_anthropic(_message(thinking, _text(_scored(score=9))))

    output, _ = await AccountScorer(fake).score_account("Acme")

    assert output.score == 9


async def test_unrecognized_company_comes_back_without_score_or_reasons():
    payload = json.dumps({
        "recognized": False, "resolved_name": "Zzyx Holdings", "resolved_domain": None,
        "score": 6, "reasons": ["a guess"],
    })
    fake = _fake_anthropic(_message(_text(payload)))

    output, _ = await AccountScorer(fake).score_account("Zzyx Holdings")

    assert output.recognized is False
    assert output.score is None
    assert output.reasons == []
    assert output.resolved_name is None


async def test_retries_once_when_output_breaks_the_contract():
    two_reasons = _scored(reasons=["one", "two"])
    fake = _fake_anthropic(_message(_text(two_reasons)), _message(_text(_scored(score=7))))

    output, _ = await AccountScorer(fake).score_account("Acme")

    assert output.score == 7
    assert fake.messages.create.await_count == 2


async def test_raises_after_second_contract_failure():
    bad = _scored(score=11)
    fake = _fake_anthropic(_message(_text(bad)), _message(_text(bad)))

    with pytest.raises(ScoringError, match="unusable score for 'Acme'"):
        await AccountScorer(fake).score_account("Acme")


async def test_contract_failure_message_is_safe_to_show_a_partner():
    bad = _scored(reasons=["only one"])
    fake = _fake_anthropic(_message(_text(bad)), _message(_text(bad)))

    with pytest.raises(ScoringError) as raised:
        await AccountScorer(fake).score_account("Acme")

    shown = str(raised.value)
    assert "only one" not in shown
    assert "pydantic" not in shown
    assert "validation error" not in shown


async def test_refusal_raises_without_retrying():
    fake = _fake_anthropic(_message(stop_reason="refusal"))

    with pytest.raises(ScoringError, match="declined"):
        await AccountScorer(fake).score_account("Acme")
    fake.messages.create.assert_awaited_once()


async def test_truncated_output_raises_without_retrying():
    fake = _fake_anthropic(_message(_text('{"recognized": tr'), stop_reason="max_tokens"))

    with pytest.raises(ScoringError, match="truncated"):
        await AccountScorer(fake).score_account("Acme")
    fake.messages.create.assert_awaited_once()


async def test_api_errors_propagate_without_a_second_attempt():
    # The SDK already retries transient failures. A permanent one (like the
    # archived-agent 400 this replaced) must not be retried again here.
    fake = MagicMock()
    fake.messages.create = AsyncMock(side_effect=RuntimeError("Error code: 400"))

    with pytest.raises(RuntimeError, match="400"):
        await AccountScorer(fake).score_account("Acme")
    fake.messages.create.assert_awaited_once()
