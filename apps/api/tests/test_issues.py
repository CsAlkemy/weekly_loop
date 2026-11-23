from app.realtime.hub import hub
from tests.conftest import login
from tests.test_todos import RecordingSocket

URL = "/api/teams/team_lead/issues"


async def issue_ids(client, status: str = "unsolved", url: str = URL) -> list[str]:
    response = await client.get(url, params={"status": status})
    assert response.status_code == 200
    return [issue["id"] for issue in response.json()]


async def test_unsolved_issues_are_listed_in_issue_order(client):
    await login(client, "u2")
    assert await issue_ids(client) == ["i2", "i1", "i5", "i3", "i4"]


async def test_issue_shows_owner_priority_created_time_and_source(client):
    await login(client, "u2")
    issues = {issue["id"]: issue for issue in (await client.get(URL)).json()}

    assert issues["i5"] == {
        "id": "i5",
        "title": "New deals closed, week of Nov 2",
        "details": None,
        "owner": {
            "id": "u2",
            "name": "Blake Brooks",
            "email": "blake@acme.test",
            "role": "team_member",
        },
        "priority": 4,
        "createdAt": "2026-11-09T16:00:00Z",
        "solvedAt": None,
        "solvedBy": None,
        "resolutionNote": None,
        "source": {
            "measurableId": "m1",
            "measurableName": "New deals closed",
            "weekStart": "2026-11-02",
        },
        "sourceTodo": None,
        "sourceRock": None,
    }
    assert issues["i4"]["priority"] is None
    assert issues["i4"]["source"] is None


async def test_solved_issues_are_listed_separately_newest_first(client):
    await login(client, "u2")
    response = await client.get(URL, params={"status": "solved"})
    solved = response.json()

    assert [issue["id"] for issue in solved] == ["i6", "i7"]
    assert solved[0]["solvedAt"] == "2026-11-04T15:40:00Z"
    assert solved[0]["resolutionNote"] == "Bank holiday moved the run; added a reminder."


async def test_unknown_status_filter_is_rejected(client):
    await login(client, "u2")
    assert (await client.get(URL, params={"status": "open"})).status_code == 422


async def test_created_issue_is_owned_by_its_creator(client):
    await login(client, "u3")
    response = await client.post(URL, json={"title": "  Slow invoicing  ", "priority": 5})
    issue = response.json()

    assert response.status_code == 201
    assert issue["title"] == "Slow invoicing"
    assert issue["owner"]["id"] == "u3"
    assert issue["priority"] == 5
    assert issue["createdAt"] == "2026-11-11T15:00:00Z"
    assert issue["solvedAt"] is None
    assert issue["details"] is None
    assert await issue_ids(client) == ["i2", "i1", issue["id"], "i5", "i3", "i4"]


async def test_an_issue_can_carry_details(client):
    await login(client, "u3")
    details = "  Invoices take 9 days to go out.\nCustomers pay late as a result.  "
    response = await client.post(URL, json={"title": "Slow invoicing", "details": details})

    assert response.status_code == 201
    assert response.json()["details"] == details.strip()
    listed = next(i for i in (await client.get(URL)).json() if i["title"] == "Slow invoicing")
    assert listed["details"] == details.strip()

    blank = await client.post(URL, json={"title": "Blank details", "details": "   "})
    assert blank.json()["details"] is None

    too_long = await client.post(URL, json={"title": "Too long", "details": "x" * 2001})
    assert too_long.status_code == 422


async def test_issue_without_priority_goes_last(client):
    await login(client, "u3")
    issue = (await client.post(URL, json={"title": "Parking"})).json()

    assert issue["priority"] is None
    assert (await issue_ids(client))[-2:] == ["i4", issue["id"]]


async def test_invalid_issues_are_rejected(client):
    await login(client, "u3")

    blank = await client.post(URL, json={"title": "   "})
    missing = await client.post(URL, json={"priority": 3})
    too_high = await client.post(URL, json={"title": "x", "priority": 6})
    too_low = await client.post(URL, json={"title": "x", "priority": 0})
    too_long = await client.post(URL, json={"title": "x" * 201})

    assert [r.status_code for r in (blank, missing, too_high, too_low, too_long)] == [422] * 5
    assert await issue_ids(client) == ["i2", "i1", "i5", "i3", "i4"]


async def test_setting_priority_reorders_the_list(client):
    await login(client, "u2")
    response = await client.patch(f"{URL}/i4", json={"priority": 5, "expected": None})

    assert response.status_code == 200
    assert response.json()["priority"] == 5
    assert await issue_ids(client) == ["i4", "i2", "i1", "i5", "i3"]


async def test_priority_can_be_cleared(client):
    await login(client, "u2")
    await client.patch(f"{URL}/i2", json={"priority": None, "expected": 5})

    assert await issue_ids(client) == ["i1", "i5", "i3", "i4", "i2"]


async def test_invalid_priority_is_rejected(client):
    await login(client, "u2")

    assert (await client.patch(f"{URL}/i3", json={"priority": 9, "expected": 3})).status_code == 422
    assert (await client.patch(f"{URL}/i3", json={})).status_code == 422


async def test_solving_needs_a_note_and_moves_the_issue_to_solved(client):
    await login(client, "u2")

    assert (await client.post(f"{URL}/i3/solve", json={"note": "  "})).status_code == 422
    assert (await client.post(f"{URL}/i3/solve", json={})).status_code == 422

    response = await client.post(f"{URL}/i3/solve", json={"note": " Hired a weekend agent. "})
    assert response.status_code == 200
    assert response.json()["solvedAt"] == "2026-11-11T15:00:00Z"
    assert response.json()["resolutionNote"] == "Hired a weekend agent."
    assert response.json()["solvedBy"]["name"] == "Blake Brooks"
    assert await issue_ids(client) == ["i2", "i1", "i5", "i4"]
    assert await issue_ids(client, "solved") == ["i3", "i6", "i7"]


async def test_solved_issue_cannot_be_solved_or_reprioritised_again(client):
    await login(client, "u2")

    assert (await client.post(f"{URL}/i6/solve", json={"note": "Again"})).status_code == 409
    assert (await client.patch(f"{URL}/i6", json={"priority": 1, "expected": 2})).status_code == 409


async def test_todo_from_an_issue_is_due_in_7_days_and_linked(client):
    await login(client, "u2")
    response = await client.post(
        f"{URL}/i1/todos", json={"title": "Post the job ad", "ownerId": "u3"}
    )
    todo = response.json()

    assert response.status_code == 201
    assert todo["title"] == "Post the job ad"
    assert todo["owner"]["id"] == "u3"
    assert todo["dueDate"] == "2026-11-18"
    assert todo["createdAt"] == "2026-11-11T15:00:00Z"
    assert todo["doneAt"] is None
    assert todo["sourceIssue"] == {"id": "i1", "title": "Hiring pipeline is slow"}

    todos = (await client.get("/api/teams/team_lead/todos")).json()["todos"]
    assert todo["id"] in [item["id"] for item in todos]


async def test_todo_due_date_uses_the_company_date(client, set_now):
    await login(client, "u2")
    set_now("2026-11-12T03:00:00Z")
    response = await client.post(f"{URL}/i1/todos", json={"title": "Late", "ownerId": "u3"})

    assert response.json()["dueDate"] == "2026-11-18"


async def test_todo_can_be_added_to_a_solved_issue(client):
    await login(client, "u2")
    response = await client.post(f"{URL}/i6/todos", json={"title": "Follow up", "ownerId": "u3"})

    assert response.status_code == 201


async def test_todo_owner_must_be_an_admin_or_team_member_of_the_team(client):
    await login(client, "u2")

    observer = await client.post(f"{URL}/i1/todos", json={"title": "x", "ownerId": "u5"})
    other_team = await client.post(f"{URL}/i1/todos", json={"title": "x", "ownerId": "u6"})
    unknown = await client.post(f"{URL}/i1/todos", json={"title": "x", "ownerId": "nobody"})
    admin = await client.post(f"{URL}/i1/todos", json={"title": "x", "ownerId": "u1"})

    assert [r.status_code for r in (observer, other_team, unknown)] == [422] * 3
    assert admin.status_code == 201


async def test_admin_outside_the_team_is_not_an_eligible_todo_owner(client):
    await login(client, "u1")
    response = await client.post(
        "/api/teams/team_sales/issues/i8/todos", json={"title": "x", "ownerId": "u1"}
    )

    assert response.status_code == 422


async def test_observer_can_read_but_not_change_issues(client):
    await login(client, "u5")

    assert (await client.get(URL)).status_code == 200
    writes = [
        await client.post(URL, json={"title": "Observer issue"}),
        await client.patch(f"{URL}/i3", json={"priority": 5, "expected": 3}),
        await client.post(f"{URL}/i3/solve", json={"note": "Done"}),
        await client.post(f"{URL}/i3/todos", json={"title": "x", "ownerId": "u3"}),
    ]
    assert [response.status_code for response in writes] == [403] * 4
    assert await issue_ids(client) == ["i2", "i1", "i5", "i3", "i4"]


async def test_another_teams_issues_are_refused(client):
    await login(client, "u6")

    assert (await client.get(URL)).status_code == 403
    assert (await client.post(URL, json={"title": "Not mine"})).status_code == 403
    assert (await client.post(f"{URL}/i3/solve", json={"note": "x"})).status_code == 403


async def test_issue_from_another_team_is_not_found_through_my_team(client):
    await login(client, "u6")
    base = "/api/teams/team_sales/issues"

    assert (
        await client.patch(f"{base}/i3", json={"priority": 5, "expected": 3})
    ).status_code == 404
    assert (await client.post(f"{base}/i3/solve", json={"note": "x"})).status_code == 404
    response = await client.post(f"{base}/i3/todos", json={"title": "x", "ownerId": "u6"})
    assert response.status_code == 404


async def test_admin_can_work_issues_in_any_team(client):
    await login(client, "u1")
    base = "/api/teams/team_ops/issues"
    created = await client.post(base, json={"title": "Dock scheduling"})

    assert created.status_code == 201
    assert created.json()["owner"]["id"] == "u1"
    assert (await client.post(f"{base}/i9/solve", json={"note": "New carrier"})).status_code == 200


async def test_issues_need_a_signed_in_user(client):
    assert (await client.get(URL)).status_code == 401
    assert (await client.post(URL, json={"title": "x"})).status_code == 401


async def test_issue_and_todo_changes_are_published_to_the_team(client):
    socket = RecordingSocket()
    hub.join("team_lead", socket)
    try:
        await login(client, "u2")
        await client.post(URL, json={"title": "New"})
        await client.patch(f"{URL}/i3", json={"priority": 1, "expected": 3})
        await client.post(f"{URL}/i3/todos", json={"title": "x", "ownerId": "u3"})
        await client.post(f"{URL}/i3/solve", json={"note": "Done"})
    finally:
        hub.leave("team_lead", socket)

    assert [event["resource"] for event in socket.events] == ["issues", "issues", "todos", "issues"]


async def test_a_priority_change_based_on_a_stale_priority_is_refused(client):
    await login(client, "u2")
    assert (await client.patch(f"{URL}/i3", json={"priority": 5, "expected": 3})).status_code == 200

    stale = await client.patch(f"{URL}/i3", json={"priority": 1, "expected": 3})
    assert stale.status_code == 409
    assert "changed this Issue's priority to 5" in stale.json()["detail"]
    assert (await client.patch(f"{URL}/i3", json={"priority": 3})).status_code == 422
    assert (await client.patch(f"{URL}/i3", json={"priority": 1, "expected": 5})).status_code == 200
