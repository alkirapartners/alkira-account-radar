from __future__ import annotations
import asyncio
from collections import defaultdict
from typing import AsyncIterator
from radar.schemas import SSEEvent


class EventBus:
    """Per-batch in-process pub/sub with replay for late subscribers."""

    def __init__(self) -> None:
        self._buffers: dict[str, list[SSEEvent]] = defaultdict(list)
        self._subs: dict[str, list[asyncio.Queue]] = defaultdict(list)
        self._closed: set[str] = set()
        self._lock = asyncio.Lock()

    async def publish(self, batch_id: str, event: SSEEvent) -> None:
        async with self._lock:
            self._buffers[batch_id].append(event)
            queues = list(self._subs[batch_id])
        for q in queues:
            await q.put(event)

    async def close(self, batch_id: str) -> None:
        async with self._lock:
            self._closed.add(batch_id)
            queues = list(self._subs[batch_id])
        for q in queues:
            await q.put(None)

    def subscribe(self, batch_id: str) -> AsyncIterator[SSEEvent]:
        q: asyncio.Queue = asyncio.Queue()
        for ev in self._buffers[batch_id]:
            q.put_nowait(ev)
        if batch_id in self._closed:
            q.put_nowait(None)
        else:
            self._subs[batch_id].append(q)

        async def _iter():
            while True:
                ev = await q.get()
                if ev is None:
                    return
                yield ev

        return _iter()


bus = EventBus()
