from __future__ import annotations
import json
import os
from datetime import datetime, timezone
from typing import Optional
from supabase import Client, create_client


def make_client() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


class RadarRepo:
    """All Supabase queries for the radar tool. One method per use case."""

    def __init__(self, client: Client):
        self.c = client

    def _set_partner_jwt(self, email: str) -> None:
        claims = json.dumps({"email": email, "role": "authenticated"})
        self.c.postgrest.session.headers["X-PostgREST-Setting-request.jwt.claims"] = claims

    def create_batch(self, partner_email: str, input_raw: str,
                     input_count: int, unique_count: int) -> dict:
        self._set_partner_jwt(partner_email)
        res = self.c.table("radar_batches").insert({
            "partner_email": partner_email,
            "input_raw": input_raw,
            "input_count": input_count,
            "unique_count": unique_count,
            "status": "running",
        }).execute()
        return res.data[0]

    def insert_pending_results(self, batch_id: str, names: list[str]) -> list[dict]:
        rows = [{"batch_id": batch_id, "account_name": n, "status": "pending"} for n in names]
        res = self.c.table("radar_results").insert(rows).execute()
        return res.data

    def update_result_done(self, result_id: str, resolved_name: Optional[str],
                           resolved_domain: Optional[str], score: Optional[int],
                           fit_bullet: Optional[str], objection_bullet: Optional[str],
                           action_bullet: Optional[str], sources: list[str],
                           agent_run_id: Optional[str]) -> None:
        self.c.table("radar_results").update({
            "status": "done",
            "resolved_name": resolved_name,
            "resolved_domain": resolved_domain,
            "score": score,
            "fit_bullet": fit_bullet,
            "objection_bullet": objection_bullet,
            "action_bullet": action_bullet,
            "sources": sources,
            "agent_run_id": agent_run_id,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", result_id).execute()

    def update_result_error(self, result_id: str, message: str) -> None:
        self.c.table("radar_results").update({
            "status": "error",
            "error_message": message,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", result_id).execute()

    def complete_batch(self, batch_id: str, status: str = "done") -> None:
        self.c.table("radar_batches").update({
            "status": status,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", batch_id).execute()

    def get_batch(self, batch_id: str, partner_email: str) -> Optional[dict]:
        self._set_partner_jwt(partner_email)
        res = self.c.table("radar_batches").select("*").eq("id", batch_id).execute()
        return res.data[0] if res.data else None

    def get_results(self, batch_id: str, partner_email: str) -> list[dict]:
        self._set_partner_jwt(partner_email)
        res = self.c.table("radar_results").select("*").eq("batch_id", batch_id).execute()
        return res.data

    def list_batches(self, partner_email: str, limit: int = 50) -> list[dict]:
        self._set_partner_jwt(partner_email)
        res = (self.c.table("radar_batches")
               .select("*, radar_results!inner(id)")
               .eq("partner_email", partner_email)
               .order("created_at", desc=True).limit(limit).execute())
        for b in res.data:
            b.pop("radar_results", None)
        return res.data

    def count_batches_today(self, partner_email: str) -> int:
        self._set_partner_jwt(partner_email)
        midnight = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        ).isoformat()
        res = (self.c.table("radar_batches").select("id", count="exact")
               .eq("partner_email", partner_email)
               .gte("created_at", midnight).execute())
        return res.count or 0

    def delete_result(self, result_id: str, partner_email: str) -> bool:
        """Delete a result row after verifying the caller owns the parent batch.
        Uses service-role (no JWT override) so no DELETE RLS policy is needed.
        Ownership is enforced by joining radar_batches in the existence check.
        """
        res = (self.c.table("radar_results")
               .select("id, batch_id, radar_batches!inner(partner_email)")
               .eq("id", result_id)
               .execute())
        if not res.data:
            return False
        batch_email = (res.data[0].get("radar_batches") or {}).get("partner_email", "")
        if batch_email.lower() != partner_email.lower():
            return False
        self.c.table("radar_results").delete().eq("id", result_id).execute()
        return True

    def delete_batch(self, batch_id: str, partner_email: str) -> bool:
        """Delete a batch and all its results after verifying ownership."""
        batch = self.get_batch(batch_id, partner_email)
        if not batch:
            return False
        if batch.get("partner_email", "").lower() != partner_email.lower():
            return False
        self.c.table("radar_results").delete().eq("batch_id", batch_id).execute()
        self.c.table("radar_batches").delete().eq("id", batch_id).execute()
        return True
