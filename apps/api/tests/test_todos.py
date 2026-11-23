from app.realtime.hub import hub
from tests.conftest import login

URL = "/api/teams/team_lead/todos"


class RecordingSocket:
    def __init__(self) -> None:
        self.events: list[dict] = []

    async def send_json(self, event: dict) -> None:
        self.events.append(event)


async def todo_list(client, url: str = URL) -> dict:
    response = await client.get(url)
    assert response.status_code == 200
    return response.json()


async def test_todos_show_owner_due_date_done_time_and_source_issue(client):
    await login(client, "u2")
    todos = {todo["id"]: todo for todo in (await todo_list(client))["todos"]}

    assert len(todos) == 18
    assert todos["t20"] == {
        "id": "t20",
        "title": "Assign onboarding docs owner",
        "owner": {
            "id": "u4",
            "name": "Dana Diaz",
            "email": "dana@acme.test",
            "role": "team_member",
        },
        "dueDate": "2026-11-04",
        "doneAt": "2026-11-03T20:00:00Z",
        "doneBy": None,
        "createdAt": "2026-10-28T15:35:00Z",
        "overdue": False,
        "sourceIssue": {"id": "i7", "title": "Onboarding docs are outdated"},
        "openIssueId": None,
    }
    assert todos["t12"]["sourceIssue"] is None
    assert todos["t12"]["doneAt"] is None


async def test_open_todos_come_first_by_due_date_then_done_ones_newest_first(client):
    await login(client, "u2")
    ids = [todo["id"] for todo in (await todo_list(client))["todos"]]

    assert ids[:4] == ["t12", "t31", "t30", "t32"]
    assert ids[4:6] == ["t29", "t28"]
    assert ids[-1] == "t1"


async def test_overdue_means_not_done_and_due_before_today(client):
    await login(client, "u2")
    todos = (await todo_list(client))["todos"]

    assert sorted(todo["id"] for todo in todos if todo["overdue"]) == ["t12", "t31"]


async def test_last_closed_weeks_completion_rate(client):
    await login(client, "u2")
    body = await todo_list(client)

    assert body["lastClosedWeek"] == "2026-11-02"
    assert body["completion"] == {"due": 10, "done": 9, "ratePercent": 90, "meetsTarget": True}


async def test_week_with_nothing_due_has_no_completion_rate(client):
    await login(client, "u6")
    body = await todo_list(client, "/api/teams/team_sales/todos")

    assert body["lastClosedWeek"] == "2026-11-02"
    assert body["completion"] is None


async def test_mark_done_stamps_the_app_clock_and_clears_overdue(client):
    await login(client, "u2")
    response = await client.post(f"{URL}/t12/done")

    assert response.status_code == 200
    assert response.json()["doneAt"] == "2026-11-11T15:00:00Z"
    assert response.json()["overdue"] is False


async def test_undo_reopens_the_todo(client):
    await login(client, "u2")
    await client.post(f"{URL}/t12/done")
    response = await client.delete(f"{URL}/t12/done")

    assert response.status_code == 200
    assert response.json()["doneAt"] is None
    assert response.json()["overdue"] is True


async def test_marking_a_done_todo_again_keeps_its_original_done_time(client):
    await login(client, "u2")
    response = await client.post(f"{URL}/t10/done")

    assert response.json()["doneAt"] == "2026-10-26T19:00:00Z"
    assert response.json()["doneBy"] is None


async def test_anyone_who_can_change_the_team_marks_a_to_do_done_and_is_named(client):
    await login(client, "u1")
    done = (await client.post(f"{URL}/t12/done")).json()
    assert done["owner"]["id"] != "u1"
    assert done["doneBy"]["name"] == "Avery Admin"

    await login(client, "u3")
    assert (await client.post(f"{URL}/t12/done")).json()["doneBy"]["name"] == "Avery Admin"
    assert (await client.delete(f"{URL}/t12/done")).json()["doneBy"] is None
    assert (await client.post(f"{URL}/t12/done")).json()["doneBy"]["name"] == "Casey Cho"


async def test_done_within_the_due_week_counts_towards_completion(client, set_now):
    await login(client, "u2")
    set_now("2026-11-12T15:00:00Z")
    await client.post(f"{URL}/t31/done")

    set_now("2026-11-18T15:00:00Z")
    body = await todo_list(client)
    assert body["lastClosedWeek"] == "2026-11-09"
    assert body["completion"] == {"due": 3, "done": 1, "ratePercent": 33, "meetsTarget": False}


async def test_done_after_the_due_week_does_not_count(client, set_now):
    await login(client, "u2")
    set_now("2026-11-18T15:00:00Z")
    await client.post(f"{URL}/t32/done")

    body = await todo_list(client)
    assert body["completion"] == {"due": 3, "done": 0, "ratePercent": 0, "meetsTarget": False}


async def test_observer_can_read_but_not_change_todos(client):
    await login(client, "u5")

    assert (await client.get(URL)).status_code == 200
    assert (await client.post(f"{URL}/t12/done")).status_code == 403
    assert (await client.delete(f"{URL}/t10/done")).status_code == 403

    todos = {todo["id"]: todo for todo in (await todo_list(client))["todos"]}
    assert todos["t12"]["doneAt"] is None
    assert todos["t10"]["doneAt"] == "2026-10-26T19:00:00Z"


async def test_another_teams_todos_are_refused(client):
    await login(client, "u6")

    assert (await client.get(URL)).status_code == 403
    assert (await client.post(f"{URL}/t12/done")).status_code == 403


async def test_todo_from_another_team_is_not_found_through_my_team(client):
    await login(client, "u8")

    assert (await client.post("/api/teams/team_ops/todos/t12/done")).status_code == 404
    assert (await client.delete("/api/teams/team_ops/todos/t10/done")).status_code == 404


async def test_admin_can_change_todos_in_any_team(client):
    await login(client, "u1")
    response = await client.post("/api/teams/team_sales/todos/t40/done")

    assert response.status_code == 200
    assert response.json()["doneAt"] == "2026-11-11T15:00:00Z"


async def test_todos_need_a_signed_in_user(client):
    assert (await client.get(URL)).status_code == 401
    assert (await client.post(f"{URL}/t12/done")).status_code == 401


async def test_changes_are_published_to_the_teams_channel_only(client):
    lead, sales = RecordingSocket(), RecordingSocket()
    hub.join("team_lead", lead)
    hub.join("team_sales", sales)
    try:
        await login(client, "u2")
        await client.post(f"{URL}/t12/done")
        await client.delete(f"{URL}/t12/done")
    finally:
        hub.leave("team_lead", lead)
        hub.leave("team_sales", sales)

    assert lead.events == [{"type": "invalidate", "resource": "todos"}] * 2
    assert sales.events == []


async def test_completion_history_covers_the_last_eight_closed_weeks(client):
    await login(client, "u2")
    body = await todo_list(client)

    history = body["history"]
    assert [week["weekStart"] for week in history][-2:] == ["2026-10-26", "2026-11-02"]
    assert len(history) == 8
    assert history[-1]["completion"] == body["completion"]
    assert history[-2]["completion"] == {
        "due": 3,
        "done": 2,
        "ratePercent": 67,
        "meetsTarget": False,
    }


async def test_this_week_so_far_moves_as_to_dos_are_ticked(client):
    await login(client, "u2")
    before = await todo_list(client)
    assert before["thisWeek"]["weekStart"] == "2026-11-09"
    assert before["thisWeek"]["completion"] == {
        "due": 3,
        "done": 0,
        "ratePercent": 0,
        "meetsTarget": False,
    }

    await client.post(f"{URL}/t31/done")
    after = await todo_list(client)
    assert after["thisWeek"]["completion"]["done"] == 1
    assert after["thisWeek"]["completion"]["ratePercent"] == 33
    assert after["completion"] == before["completion"]
