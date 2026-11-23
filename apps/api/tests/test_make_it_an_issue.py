import asyncio
from datetime import date

from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from app.db.models import Issue
from app.main import app
from app.realtime.hub import hub
from tests.conftest import login
from tests.test_todos import RecordingSocket


def url(measurable_id: str, week: str, team_id: str = "team_lead") -> str:
    return f"/api/teams/{team_id}/measurables/{measurable_id}/scores/{week}/issue"


async def unsolved_ids(client) -> list[str]:
    return [issue["id"] for issue in (await client.get("/api/teams/team_lead/issues")).json()]


async def test_off_track_score_becomes_an_issue_owned_by_whoever_clicked(client):
    await login(client, "u4")
    response = await client.post(url("m1", "2026-10-26"))
    issue = response.json()

    assert response.status_code == 201
    assert issue["title"] == "New deals closed, week of Oct 26"
    assert issue["owner"]["id"] == "u4"
    assert issue["priority"] is None
    assert issue["createdAt"] == "2026-11-11T15:00:00Z"
    assert issue["source"] == {
        "measurableId": "m1",
        "measurableName": "New deals closed",
        "weekStart": "2026-10-26",
    }
    assert (await unsolved_ids(client))[-1] == issue["id"]


async def test_existing_unsolved_issue_is_returned_instead_of_a_duplicate(client):
    await login(client, "u4")
    response = await client.post(url("m1", "2026-11-02"))

    assert response.status_code == 200
    assert response.json()["id"] == "i5"
    assert response.json()["owner"]["id"] == "u2"
    assert await unsolved_ids(client) == ["i2", "i1", "i5", "i3", "i4"]


async def test_asking_twice_returns_the_same_issue(client):
    await login(client, "u2")
    first = await client.post(url("m3", "2026-11-02"))
    second = await client.post(url("m3", "2026-11-02"))

    assert (first.status_code, second.status_code) == (201, 200)
    assert first.json()["id"] == second.json()["id"]


async def test_new_issue_is_allowed_once_the_earlier_one_is_solved(client):
    await login(client, "u3")
    response = await client.post(url("m4", "2026-10-26"))

    assert response.status_code == 201
    assert response.json()["id"] != "i6"
    assert response.json()["title"] == "Payroll runs, week of Oct 26"


async def test_closed_week_without_a_score_can_become_an_issue(client):
    await login(client, "u4")
    response = await client.post(url("m5", "2026-10-19"))

    assert response.status_code == 201
    assert response.json()["title"] == "Cash on hand, week of Oct 19"


async def test_only_off_track_scores_can_become_issues(client):
    await login(client, "u2")

    on_track = await client.post(url("m1", "2026-10-19"))
    pending = await client.post(url("m1", "2026-11-09"))

    assert (on_track.status_code, pending.status_code) == (409, 409)
    assert await unsolved_ids(client) == ["i2", "i1", "i5", "i3", "i4"]


async def test_invalid_weeks_are_rejected(client):
    await login(client, "u2")

    assert (await client.post(url("m1", "2026-10-27"))).status_code == 422
    assert (await client.post(url("m1", "2026-11-16"))).status_code == 422


async def test_scorecard_cell_points_at_its_open_issue(client):
    await login(client, "u2")
    created = (await client.post(url("m1", "2026-10-26"))).json()
    body = (await client.get("/api/teams/team_lead/scorecard")).json()
    cells = {
        cell["weekStart"]: cell
        for cell in next(m for m in body["measurables"] if m["id"] == "m1")["cells"]
    }
    payroll = next(m for m in body["measurables"] if m["id"] == "m4")["cells"]

    assert cells["2026-11-02"]["issueId"] == "i5"
    assert cells["2026-10-26"]["issueId"] == created["id"]
    assert cells["2026-10-19"]["issueId"] is None
    assert next(c for c in payroll if c["weekStart"] == "2026-10-26")["issueId"] is None


async def test_concurrent_requests_create_exactly_one_issue(client, db):
    users = ["u1", "u2", "u3", "u4"] * 3
    clients = [AsyncClient(transport=ASGITransport(app=app), base_url="http://test") for _ in users]
    try:
        for other, user_id in zip(clients, users, strict=True):
            await login(other, user_id)
        responses = await asyncio.gather(
            *(other.post(url("m1", "2026-10-26")) for other in clients)
        )
    finally:
        for other in clients:
            await other.aclose()

    assert sorted(response.status_code for response in responses) == [200] * 11 + [201]
    assert len({response.json()["id"] for response in responses}) == 1
    count = await db.scalar(
        select(func.count())
        .select_from(Issue)
        .where(Issue.source_measurable_id == "m1", Issue.source_week_start == date(2026, 10, 26))
    )
    assert count == 1


async def test_observer_cannot_make_an_issue(client):
    await login(client, "u5")

    assert (await client.post(url("m1", "2026-10-26"))).status_code == 403
    assert await unsolved_ids(client) == ["i2", "i1", "i5", "i3", "i4"]


async def test_another_teams_score_is_refused(client):
    await login(client, "u6")

    assert (await client.post(url("m1", "2026-10-26"))).status_code == 403
    assert (await client.post(url("m1", "2026-10-26", "team_sales"))).status_code == 404


async def test_signed_out_requests_are_refused(client):
    assert (await client.post(url("m1", "2026-10-26"))).status_code == 401


async def test_only_a_new_issue_is_published(client):
    socket = RecordingSocket()
    hub.join("team_lead", socket)
    try:
        await login(client, "u2")
        await client.post(url("m1", "2026-10-26"))
        await client.post(url("m1", "2026-10-26"))
    finally:
        hub.leave("team_lead", socket)

    assert [event["resource"] for event in socket.events] == ["issues", "scorecard"]
