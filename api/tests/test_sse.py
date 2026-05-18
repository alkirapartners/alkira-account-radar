import pytest
from radar.sse import EventBus
from radar.schemas import SSEEvent


@pytest.mark.asyncio
async def test_publish_then_subscribe_replays():
    bus = EventBus()
    e1 = SSEEvent(type="pending", batch_id="b1", index=0)
    e2 = SSEEvent(type="result", batch_id="b1", index=0, row={"score": 8})

    await bus.publish("b1", e1)
    await bus.publish("b1", e2)

    sub = bus.subscribe("b1")
    await bus.close("b1")

    received = [e async for e in sub]
    assert [e.type for e in received] == ["pending", "result"]


@pytest.mark.asyncio
async def test_separate_batches_isolated():
    bus = EventBus()
    sub_a = bus.subscribe("a")

    await bus.publish("b", SSEEvent(type="pending", batch_id="b", index=0))
    await bus.publish("a", SSEEvent(type="pending", batch_id="a", index=0))
    await bus.close("a")

    received = [e async for e in sub_a]
    assert len(received) == 1
    assert received[0].batch_id == "a"
