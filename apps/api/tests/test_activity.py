from tests.conftest import login

BASE = "/api/teams/team_lead"


async def activity(client, team: str = "team_lead") -> list[dict]:
    response = await client.get(f"/api/teams/{team}/activity")
    assert response.status_code == 200
    return response.json()


async def test_changes_are_logged_with_who_and_what_newest_first(client, set_now):
    await login(client, "u2")
    set_now("2026-11-11T15:00:00Z")
    await client.put(
        f"{BASE}/measurables/m1/scores/2026-11-09", json={"value": 11, "expected": None}
    )
    set_now("2026-11-11T15:01:00Z")
    await client.patch(f"{BASE}/issues/i3", json={"priority": 5, "expected": 3})
    set_now("2026-11-11T15:02:00Z")
    await client.post(f"{BASE}/todos/t12/done")
    set_now("2026-11-11T15:03:00Z")
    await client.post(f"{BASE}/issues/i3/solve", json={"note": "Covered."})

    entries = await activity(client)
    assert [(entry["action"], entry["summary"]) for entry in entries] == [
        ("issue.solved", "Solved Support coverage on weekends"),
        ("todo.done", "Marked Publish hiring ad done"),
        ("issue.priority", "Set the priority of Support coverage on weekends to 5"),
        ("score.set", "Set New deals closed, week of Nov 9 to 11"),
    ]
    assert {entry["actor"]["id"] for entry in entries} == {"u2"}
    assert entries[0]["at"] == "2026-11-11T15:03:00Z"


async def test_refused_changes_are_not_logged(client):
    await login(client, "u2")
    await client.put(f"{BASE}/measurables/m1/scores/2026-11-02", json={"value": 9, "expected": 7})
    await login(client, "u5")
    await client.post(f"{BASE}/todos/t12/done")

    assert await activity(client) == []


async def test_the_log_follows_team_access(client):
    await login(client, "u2")
    await client.post(f"{BASE}/todos/t12/done")

    await login(client, "u5")
    assert [entry["action"] for entry in await activity(client)] == ["todo.done"]
    await login(client, "u6")
    assert (await client.get(f"{BASE}/activity")).status_code == 403
    assert await activity(client, "team_sales") == []
