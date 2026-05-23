from __future__ import annotations
import json
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class AgentOutput(BaseModel):
    resolved_name: Optional[str] = None
    resolved_domain: Optional[str] = None
    score: Optional[int] = Field(default=None, ge=1, le=10)
    fit_bullet: Optional[str] = None
    objection_bullet: Optional[str] = None
    action_bullet: Optional[str] = None
    sources: list[str] = Field(default_factory=list)
    status: Literal["ok", "not_found"] = "ok"
    error_message: Optional[str] = None

    @model_validator(mode="after")
    def _check_consistency(self) -> "AgentOutput":
        if self.status == "ok":
            missing = [
                f for f in ("fit_bullet", "objection_bullet", "action_bullet", "score")
                if getattr(self, f) in (None, "")
            ]
            if missing:
                raise ValueError(
                    f"AgentOutput with status=ok missing required fields: {missing}"
                )
        return self


class BatchCreateRequest(BaseModel):
    raw: str = Field(min_length=1, max_length=20_000)


class BatchLabelRequest(BaseModel):
    label: str = Field(default="", max_length=200)


class ResultRow(BaseModel):
    id: str
    account_name: str
    resolved_name: Optional[str] = None
    resolved_domain: Optional[str] = None
    score: Optional[int] = None
    fit_bullet: Optional[str] = None
    objection_bullet: Optional[str] = None
    action_bullet: Optional[str] = None
    sources: list[str] = Field(default_factory=list)
    status: Literal["pending", "done", "error"] = "pending"
    error_message: Optional[str] = None

    @field_validator("sources", mode="before")
    @classmethod
    def _coerce_null_sources(cls, v):
        return v if v is not None else []


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
