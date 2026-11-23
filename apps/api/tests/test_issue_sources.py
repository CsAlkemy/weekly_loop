import asyncio

from tests.conftest import login

BASE = "/api/teams/team_lead"


async def open_issue_ids(client) -> list[str]:
    return [issue["id"] for issue in (await client.get(f"{BASE}/issues")).json()]


async def test_an_overdue_to_do_becomes_one_issue_linked_back_to_it(client):
    await login(client, "u2")
    first = await client.post(f"{BASE}/todos/t12/issue")
    again = await client.post(f"{BASE}/todos/t12/issue")

    assert (first.status_code, again.status_code) == (201, 200)
    assert first.json()["id"] == again.json()["id"]
    issue = first.json()
    assert issue["title"] == "Overdue To-Do: Publish hiring ad"
    assert issue["sourceTodo"] == {"id": "t12", "title": "Publish hiring ad"}
    assert issue["source"] is None and issue["sourceRock"] is None
    assert issue["owner"]["id"] == "u2"
    todos = {todo["id"]: todo for todo in (await client.get(f"{BASE}/todos")).json()["todos"]}
    assert todos["t12"]["openIssueId"] == issue["id"]
    assert todos["t31"]["openIssueId"] is None


async def test_only_an_overdue_to_do_can_become_an_issue(client):
    await login(client, "u2")

    assert (await client.post(f"{BASE}/todos/t32/issue")).status_code == 409
    assert (await client.post(f"{BASE}/todos/t20/issue")).status_code == 409
    assert (await client.post(f"{BASE}/todos/t_missing/issue")).status_code == 404


async def test_an_off_track_rock_becomes_one_issue_linked_back_to_it(client):
    await login(client, "u3")
    first = await client.post(f"{BASE}/rocks/r4/issue")
    again = await client.post(f"{BASE}/rocks/r4/issue")

    assert (first.status_code, again.status_code) == (201, 200)
    assert first.json()["id"] == again.json()["id"]
    assert first.json()["sourceRock"] == {"id": "r4", "title": "Refresh brand"}
    rocks = {rock["id"]: rock for rock in (await client.get(f"{BASE}/rocks")).json()}
    assert rocks["r4"]["openIssueId"] == first.json()["id"]


async def test_only_an_off_track_rock_can_become_an_issue(client):
    await login(client, "u3")

    assert (await client.post(f"{BASE}/rocks/r3/issue")).status_code == 409
    assert (await client.post(f"{BASE}/rocks/r_missing/issue")).status_code == 404


async def test_a_new_issue_can_be_made_once_the_last_one_is_solved(client):
    await login(client, "u2")
    first = (await client.post(f"{BASE}/todos/t12/issue")).json()
    await client.post(f"{BASE}/issues/{first['id']}/solve", json={"note": "Talked it through."})

    second = await client.post(f"{BASE}/todos/t12/issue")
    assert second.status_code == 201
    assert second.json()["id"] != first["id"]


async def test_concurrent_requests_for_the_same_to_do_or_rock_return_one_issue(client):
    await login(client, "u2")
    todo_responses, rock_responses = await asyncio.gather(
        asyncio.gather(*(client.post(f"{BASE}/todos/t31/issue") for _ in range(8))),
        asyncio.gather(*(client.post(f"{BASE}/rocks/r4/issue") for _ in range(8))),
    )

    for responses in (todo_responses, rock_responses):
        assert sorted(r.status_code for r in responses) == [200] * 7 + [201]
        assert len({r.json()["id"] for r in responses}) == 1


async def test_observers_and_other_teams_cannot_make_issues_from_to_dos_or_rocks(client):
    await login(client, "u5")
    assert (await client.post(f"{BASE}/todos/t12/issue")).status_code == 403
    assert (await client.post(f"{BASE}/rocks/r4/issue")).status_code == 403

    await login(client, "u6")
    assert (await client.post(f"{BASE}/todos/t12/issue")).status_code == 403
    assert (await client.post("/api/teams/team_sales/rocks/r4/issue")).status_code == 404
