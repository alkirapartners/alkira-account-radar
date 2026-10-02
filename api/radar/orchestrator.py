from __future__ import annotations
import asyncio
import logging
from radar.schemas import SSEEvent
from radar.sse import EventBus

log = logging.getLogger(__name__)


class RadarOrchestrator:
    """Run N scoring calls in parallel under a semaphore, persist and stream."""

    def __init__(self, scorer, repo, bus: EventBus, concurrency: int = 8):
        self.scorer = scorer
        self.repo = repo
        self.bus = bus
        self.sem = asyncio.Semaphore(concurrency)

    async def run(self, batch_id: str, account_names: list[str]) -> None:
        rows = self.repo.insert_pending_results(batch_id, account_names)
        for i, row in enumerate(rows):
            await self.bus.publish(batch_id, SSEEvent(
                type="pending", batch_id=batch_id, index=i,
                row={"id": row["id"], "account_name": row["account_name"], "status": "pending"},
            ))
        await asyncio.gather(*[self._run_one(batch_id, i, r) for i, r in enumerate(rows)])
        self.repo.complete_batch(batch_id, status="done")
        await self.bus.publish(batch_id, SSEEvent(type="done", batch_id=batch_id))
        await self.bus.close(batch_id)

    async def _run_one(self, batch_id: str, index: int, row: dict) -> None:
        async with self.sem:
            try:
                # An unrecognized company arrives with no score and no reasons;
                # it is still a finished row, not an error.
                output, run_id = await self.scorer.score_account(row["account_name"])
                self.repo.update_result_done(
                    result_id=row["id"],
                    resolved_name=output.resolved_name,
                    resolved_domain=output.resolved_domain,
                    score=output.score,
                    reasons=output.reasons,
                    run_id=run_id,
                )
                await self.bus.publish(batch_id, SSEEvent(
                    type="result", batch_id=batch_id, index=index,
                    row={
                        "id": row["id"],
                        "account_name": row["account_name"],
                        "resolved_name": output.resolved_name,
                        "resolved_domain": output.resolved_domain,
                        "score": output.score,
                        "reasons": output.reasons,
                        "status": "done",
                    },
                ))
            except Exception as e:
                log.exception("scoring failed for %s", row["account_name"])
                try:
                    self.repo.update_result_error(row["id"], str(e)[:500])
                except Exception:
                    log.exception("update_result_error failed")
                await self.bus.publish(batch_id, SSEEvent(
                    type="result", batch_id=batch_id, index=index,
                    row={"id": row["id"], "account_name": row["account_name"],
                         "status": "error", "error_message": str(e)[:500]},
                ))
