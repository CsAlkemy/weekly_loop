import asyncio

import psycopg

from app.realtime import hub as hub_module
from app.realtime.hub import Hub
from tests.conftest import login
from tests.test_journeys import listening
from tests.test_users import NEW_USER

BASE = "/api/teams/team_lead"
REFRESH = {"type": "refresh"}


def resources(socket) -> list[str]:
    return [event.get("resource", event["type"]) for event in socket.events]


async def test_solving_an_issue_refreshes_where_it_was_flagged(client):
    await login(client, "u2")
    from_todo = (await client.post(f"{BASE}/todos/t12/issue")).json()
    from_score = (await client.post(f"{BASE}/measurables/m3/scores/2026-11-02/issue")).json()

    async with listening("team_lead") as sockets:
        await client.post(f"{BASE}/issues/{from_todo['id']}/solve", json={"note": "Posted."})
        await client.post(f"{BASE}/issues/{from_score['id']}/solve", json={"note": "Fixed."})
        await client.post(f"{BASE}/issues/i4/solve", json={"note": "Parked."})

    assert resources(sockets["team_lead"]) == [
        "issues",
        "todos",
        "issues",
        "scorecard",
        "issues",
    ]


async def test_user_and_role_changes_refresh_every_team_in_the_company(client):
    await login(client, "u1")
    async with listening("team_lead", "team_sales", "team_ops") as sockets:
        await client.post("/api/users", json=NEW_USER)
        await client.patch("/api/users/u3", json={"name": "Casey C. Cho"})

    for socket in sockets.values():
        assert socket.events == [REFRESH, REFRESH]


async def test_the_test_forms_switch_refreshes_every_team(client):
    await login(client, "u1")
    async with listening("team_lead", "team_ops") as sockets:
        await client.patch("/api/settings", json={"testForms": True})

    for socket in sockets.values():
        assert socket.events == [REFRESH]


async def test_a_failed_hand_off_to_other_processes_does_not_fail_the_save(client, monkeypatch):
    class Broken:
        def connect(self):
            raise OSError("database unavailable")

    monkeypatch.setattr(hub_module, "engine", Broken())
    await login(client, "u2")
    async with listening("team_lead") as sockets:
        response = await client.post(f"{BASE}/todos/t12/done")

    assert response.status_code == 200
    assert resources(sockets["team_lead"]) == ["todos"]


async def test_a_listener_that_reconnects_tells_its_browsers_to_refresh(db, monkeypatch):
    real_connect = psycopg.AsyncConnection.connect
    attempts = 0

    async def flaky(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise OSError("database restarting")
        return await real_connect(*args, **kwargs)

    monkeypatch.setattr(psycopg.AsyncConnection, "connect", flaky)
    monkeypatch.setattr(hub_module, "RETRY_SECONDS", 0.05)
    other_process = Hub()
    from tests.test_todos import RecordingSocket

    socket = RecordingSocket()
    other_process.join("team_lead", socket)

    async def ignore(_: dict) -> None:
        return None

    listener = asyncio.create_task(other_process.listen(ignore))
    try:
        await asyncio.wait_for(other_process.listening.wait(), timeout=5)
    finally:
        listener.cancel()

    assert attempts == 2
    assert socket.events == [REFRESH]
