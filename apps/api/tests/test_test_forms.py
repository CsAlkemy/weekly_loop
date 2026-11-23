import pytest

from tests.conftest import login

pytestmark = pytest.mark.usefixtures("test_forms_on")

LEAD = "/api/teams/team_lead"


async def test_test_forms_validate_their_input(client):
    await login(client, "u2")

    for body in ({"title": " ", "ownerId": "u2"}, {"title": "X", "ownerId": ""}):
        assert (await client.post(f"{LEAD}/todos", json=body)).status_code == 422
    wrong_owner = await client.post(f"{LEAD}/todos", json={"title": "X", "ownerId": "u6"})
    assert wrong_owner.status_code == 422

    bad_rocks = (
        {"title": "X", "ownerId": "u2", "status": "maybe"},
        {"title": "X", "ownerId": "u2", "milestones": [{"title": "Y"}]},
        {"title": "X", "ownerId": "u5"},
    )
    for body in bad_rocks:
        assert (await client.post(f"{LEAD}/rocks", json=body)).status_code == 422


async def test_a_to_do_without_a_due_date_is_due_in_seven_days(client):
    await login(client, "u2")
    response = await client.post(f"{LEAD}/todos", json={"title": "Ring the bank", "ownerId": "u3"})

    assert response.status_code == 201
    assert response.json()["dueDate"] == "2026-11-18"
    assert response.json()["sourceIssue"] is None


async def test_a_complete_rock_without_milestones_is_100_percent(client):
    await login(client, "u1")
    response = await client.post(
        f"{LEAD}/rocks", json={"title": "Done already", "ownerId": "u2", "status": "complete"}
    )

    assert (response.json()["status"], response.json()["progressPercent"]) == ("complete", 100)
