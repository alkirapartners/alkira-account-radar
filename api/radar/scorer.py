"""Single-call account scoring.

One direct Messages API call per account: no agent, no session, no web search.
The model scores from what it already knows, guided by the cached rubric and
Alkira knowledge base in the system prefix.
"""
from __future__ import annotations
import logging
from typing import Optional
from pydantic import ValidationError
from radar import prompts
from radar.schemas import ScoreOutput

log = logging.getLogger(__name__)

MODEL = "claude-opus-5-5"
# Thinking shares this budget with the ~150-token JSON answer.
MAX_TOKENS = 4096
EFFORT = "low"
REQUEST_TIMEOUT_SECONDS = 60.0
MAX_ATTEMPTS = 2

_NULLABLE_STRING = {"anyOf": [{"type": "string"}, {"type": "null"}]}

OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "recognized": {"type": "boolean"},
        "resolved_name": _NULLABLE_STRING,
        "resolved_domain": _NULLABLE_STRING,
        "score": {"anyOf": [{"type": "integer"}, {"type": "null"}]},
        "reasons": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["recognized", "resolved_name", "resolved_domain", "score", "reasons"],
    "additionalProperties": False,
}


class ScoringError(RuntimeError):
    pass


def _parse(message) -> ScoreOutput:
    text = "".join(b.text for b in message.content if b.type == "text")
    output = ScoreOutput.model_validate_json(text)
    # An unrecognized company carries nothing else, whatever the model added.
    return output if output.recognized else ScoreOutput(recognized=False)


class AccountScorer:
    """Scores one account per call against the Messages API."""

    def __init__(self, anthropic):
        self.anthropic = anthropic

    async def score_account(self, account_name: str) -> tuple[ScoreOutput, str]:
        """Return the score and the message id that produced it.

        Retries once when the model's output breaks the contract. API errors
        propagate untouched: the SDK already retries the transient ones.
        """
        last_err: Optional[Exception] = None
        for _ in range(MAX_ATTEMPTS):
            message = await self._request(account_name)
            if message.stop_reason == "refusal":
                raise ScoringError(f"The model declined to score '{account_name}'.")
            if message.stop_reason == "max_tokens":
                raise ScoringError(f"Scoring output for '{account_name}' was truncated.")
            try:
                return _parse(message), message.id
            except ValidationError as e:
                last_err = e
                log.warning("score output for %s broke the contract: %s", account_name, e)
        # This message is shown to the partner; the detail is in the log above.
        raise ScoringError(
            f"The model returned an unusable score for '{account_name}'. Try again."
        ) from last_err

    async def _request(self, account_name: str):
        return await self.anthropic.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            thinking={"type": "adaptive"},
            output_config={
                "effort": EFFORT,
                "format": {"type": "json_schema", "schema": OUTPUT_SCHEMA},
            },
            system=[
                {
                    "type": "text",
                    "text": prompts.build_system_prefix(),
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": prompts.build_user_message(account_name)}],
        )
