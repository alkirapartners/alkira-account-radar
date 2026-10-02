from __future__ import annotations
import json
from typing import Literal, Optional
from pydantic import BaseModel, Field, model_validator


REASON_COUNT = 3


class ScoreOutput(BaseModel):
    """One account's score as returned by the model.

    A company the model does not recognize carries no score and no reasons.
    """

    recognized: bool
    resolved_name: Optional[str] = None
    resolved_domain: Optional[str] = None
    score: Optional[int] = Field(default=None, ge=1, le=10)
    reasons: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check_consistency(self) -> "ScoreOutput":
        if not self.recognized:
            return self
        if self.score is None:
            raise ValueError("A recognized company must have a score.")
        if len(self.reasons) != REASON_COUNT or not all(r.strip() for r in self.reasons):
            raise ValueError(
                f"A recognized company must have exactly {REASON_COUNT} non-empty reasons "
                f"(got {len(self.reasons)})."
            )
        return self


class BatchCreateRequest(BaseModel):
    raw: str = Field(min_length=1, max_length=20_000)


class ResultRow(BaseModel):
    id: str
    account_name: str
    resolved_name: Optional[str] = None
    resolved_domain: Optional[str] = None
    score: Optional[int] = None
    reasons: list[str] = Field(default_factory=list)
    status: Literal["pending", "done", "error"] = "pending"
    error_message: Optional[str] = None


class BatchResponse(BaseModel):
    id: str
    status: Literal["running", "done", "error"]
    input_count: int
    unique_count: int
    created_at: str
    completed_at: Optional[str] = None
    results: list[ResultRow] = Field(default_factory=list)


class SSEEvent(BaseModel):
    type: Literal["pending", "result", "done", "error"]
    batch_id: str
    index: Optional[int] = None
    row: Optional[dict] = None
    summary: Optional[dict] = None

    def to_sse_payload(self) -> str:
        return f"data: {json.dumps(self.model_dump(exclude_none=True))}\n\n"
