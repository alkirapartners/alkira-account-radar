from __future__ import annotations
import asyncio
import os
from typing import Callable
from anthropic import AsyncAnthropic
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from radar import auth, db
from radar.agent_client import make_client_from_env
from radar.orchestrator import RadarOrchestrator
from radar.parser import ParseError, parse_accounts
from radar.schemas import BatchCreateRequest, BatchResponse, ResultRow
from radar.sse import bus

RepoFactory = Callable[[], db.RadarRepo]
OrchestratorFactory = Callable[[db.RadarRepo], RadarOrchestrator]


def _default_repo() -> db.RadarRepo:
    return db.RadarRepo(db.make_client())


def _default_orchestrator(repo: db.RadarRepo) -> RadarOrchestrator:
    agent = make_client_from_env(AsyncAnthropic())
    return RadarOrchestrator(
        agent=agent, repo=repo, bus=bus,
        concurrency=int(os.environ.get("RADAR_AGENT_CONCURRENCY", "8")),
    )


def build_app(
    repo_factory: RepoFactory = _default_repo,
    orchestrator_factory: OrchestratorFactory = _default_orchestrator,
) -> FastAPI:
    app = FastAPI(title="Alkira Account Radar API")
    daily_limit = int(os.environ.get("RADAR_DAILY_BATCH_LIMIT", "5"))
    max_size = int(os.environ.get("RADAR_MAX_BATCH_SIZE", "40"))

    @app.post("/api/radar/run")
    async def create_run(
        req: BatchCreateRequest,
        partner_email: str = Depends(auth.require_partner_email),
    ) -> dict:
        repo = repo_factory()
        if repo.count_batches_today(partner_email) >= daily_limit:
            raise HTTPException(status_code=429, detail="Daily limit reached.")
        try:
            names, unique = parse_accounts(req.raw, max_size=max_size)
        except ParseError as e:
            raise HTTPException(status_code=400, detail=str(e))
        batch = repo.create_batch(
            partner_email=partner_email,
            input_raw=req.raw,
            input_count=len([s for s in req.raw.replace(",", "\n").splitlines() if s.strip()]),
            unique_count=unique,
        )
        orch = orchestrator_factory(repo)
        asyncio.create_task(orch.run(batch["id"], names))
        return {
            "id": batch["id"],
            "input_count": batch["input_count"],
            "unique_count": batch["unique_count"],
            "status": batch["status"],
            "created_at": batch["created_at"],
        }

    @app.get("/api/radar/run/{batch_id}")
    async def stream_run(
        batch_id: str, request: Request,
        partner_email: str = Depends(auth.require_partner_email),
    ):
        repo = repo_factory()
        if not repo.get_batch(batch_id, partner_email):
            raise HTTPException(status_code=404, detail="not found")

        async def event_stream():
            sub = bus.subscribe(batch_id)
            async for ev in sub:
                if await request.is_disconnected():
                    break
                yield ev.to_sse_payload()

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    @app.get("/api/radar/history")
    async def history(partner_email: str = Depends(auth.require_partner_email)) -> list[dict]:
        return repo_factory().list_batches(partner_email)

    @app.get("/api/radar/batch/{batch_id}", response_model=BatchResponse)
    async def get_batch(
        batch_id: str,
        partner_email: str = Depends(auth.require_partner_email),
    ) -> BatchResponse:
        repo = repo_factory()
        batch = repo.get_batch(batch_id, partner_email)
        if not batch:
            raise HTTPException(status_code=404, detail="not found")
        results = repo.get_results(batch_id, partner_email)
        return BatchResponse(
            id=batch["id"], status=batch["status"],
            input_count=batch["input_count"], unique_count=batch["unique_count"],
            created_at=batch["created_at"], completed_at=batch.get("completed_at"),
            results=[ResultRow(**r) for r in results],
        )

    @app.get("/api/radar/health")
    async def health() -> dict:
        return {"ok": True}

    @app.delete("/api/radar/result/{result_id}")
    async def delete_result(
        result_id: str,
        partner_email: str = Depends(auth.require_partner_email),
    ) -> dict:
        repo = repo_factory()
        deleted = repo.delete_result(result_id, partner_email)
        if not deleted:
            raise HTTPException(status_code=404, detail="not found or not yours")
        return {"ok": True}

    return app


app = build_app()
