import asyncio

from app.realtime.hub import Hub, hub
from tests.test_todos import RecordingSocket


async def noop(_: dict) -> None:
    return None


async def test_an_event_reaches_sockets_held_by_another_api_process(db):
    other_process = Hub()
    socket = RecordingSocket()
    other_process.join("team_lead", socket)
    listener = asyncio.create_task(other_process.listen(noop))
    try:
        await asyncio.wait_for(other_process.listening.wait(), timeout=5)
        await hub.invalidate("team_lead", "issues")
        for _ in range(50):
            if socket.events:
                break
            await asyncio.sleep(0.05)
    finally:
        listener.cancel()

    assert socket.events == [{"type": "invalidate", "resource": "issues"}]


async def test_a_process_does_not_deliver_its_own_events_twice(db):
    socket = RecordingSocket()
    own = Hub()
    own.join("team_lead", socket)
    listener = asyncio.create_task(own.listen(noop))
    try:
        await asyncio.wait_for(own.listening.wait(), timeout=5)
        await own.invalidate("team_lead", "todos")
        await asyncio.sleep(0.3)
    finally:
        listener.cancel()

    assert socket.events == [{"type": "invalidate", "resource": "todos"}]


async def test_control_events_reach_other_processes(db):
    received: list[dict] = []

    async def collect(event: dict) -> None:
        received.append(event)

    other_process = Hub()
    listener = asyncio.create_task(other_process.listen(collect))
    try:
        await asyncio.wait_for(other_process.listening.wait(), timeout=5)
        await hub.publish_control({"type": "clock"})
        for _ in range(50):
            if received:
                break
            await asyncio.sleep(0.05)
    finally:
        listener.cancel()

    assert received == [{"type": "clock"}]
