import pytest

from app.realtime.hub import hub
from tests.conftest import login

pytestmark = pytest.mark.usefixtures("test_forms_on")

URL = "/api/teams/team_lead/measurables"
LEADS = {
    "name": "Qualified leads",
    "ownerId": "u3",
    "unit": "count",
    "goal": {"type": "at_least", "value": 25},
}


class RecordingSocket:
    def __init__(self) -> None:
        self.events: list[dict] = []

    async def send_json(self, event: dict) -> None:
        self.events.append(event)


async def test_a_team_member_adds_a_measurable_to_the_scorecard(client):
    await login(client, "u2")
    response = await client.post(URL, json={**LEADS, "name": "  Qualified leads  "})

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Qualified leads"
    assert body["owner"]["name"] == "Casey Cho"
    assert body["goal"] == {"type": "at_least", "value": 25.0, "min": None, "max": None}

    scorecard = (await client.get("/api/teams/team_lead/scorecard")).json()
    added = next(m for m in scorecard["measurables"] if m["name"] == "Qualified leads")
    assert len(added["cells"]) == 13
    assert {cell["status"] for cell in added["cells"]} == {"pending"}


async def test_weeks_before_a_measurable_existed_are_not_missed(client):
    await login(client, "u2")
    measurable = (await client.post(URL, json=LEADS)).json()

    scored = await client.put(
        f"{URL}/{measurable['id']}/scores/2026-11-09", json={"value": 30, "expected": None}
    )
    assert scored.json()["status"] == "on_track"
    flag = await client.post(f"{URL}/{measurable['id']}/scores/2026-11-02/issue")
    assert flag.status_code == 409


async def test_a_between_goal_needs_two_numbers_in_order(client):
    await login(client, "u2")
    response = await client.post(
        URL,
        json={**LEADS, "unit": "hours", "goal": {"type": "between", "min": 2, "max": 4}},
    )
    assert response.status_code == 201
    assert response.json()["goal"]["min"] == 2.0

    for goal in (
        {"type": "between", "min": 5, "max": 4},
        {"type": "between", "min": 2},
        {"type": "at_most", "min": 1, "max": 3},
        {"type": "exactly"},
    ):
        bad = await client.post(URL, json={**LEADS, "name": "Other", "goal": goal})
        assert bad.status_code == 422


async def test_bad_names_units_and_duplicates_are_refused(client):
    await login(client, "u2")

    assert (await client.post(URL, json={**LEADS, "name": "   "})).status_code == 422
    assert (await client.post(URL, json={**LEADS, "unit": "kg"})).status_code == 422

    duplicate = await client.post(URL, json={**LEADS, "name": "new DEALS closed"})
    assert duplicate.status_code == 409
    assert (
        duplicate.json()["detail"] == "This team already has a Measurable called new DEALS closed"
    )


async def test_the_owner_must_be_a_writer_on_this_team(client):
    await login(client, "u2")

    for owner in ("u5", "u6", "u_nope"):
        response = await client.post(URL, json={**LEADS, "ownerId": owner})
        assert response.status_code == 422
        assert response.json()["detail"] == "The owner must be an Admin or Team Member of this team"


async def test_observers_and_other_teams_cannot_add_measurables(client):
    await login(client, "u5")
    assert (await client.post(URL, json=LEADS)).status_code == 403

    await login(client, "u6")
    assert (await client.post(URL, json=LEADS)).status_code == 403


async def test_adding_a_measurable_updates_the_team_live(client):
    lead, sales = RecordingSocket(), RecordingSocket()
    hub.join("team_lead", lead)
    hub.join("team_sales", sales)
    try:
        await login(client, "u2")
        await client.post(URL, json=LEADS)
    finally:
        hub.leave("team_lead", lead)
        hub.leave("team_sales", sales)

    assert lead.events == [{"type": "invalidate", "resource": "scorecard"}]
    assert sales.events == []
