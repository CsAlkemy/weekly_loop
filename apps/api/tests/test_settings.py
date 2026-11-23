from tests.conftest import login
from tests.test_journeys import listening
from tests.test_users import NEW_USER

LEAD = "/api/teams/team_lead"
NEW_TODO = {"title": "Ring the bank", "ownerId": "u3"}


async def todo_titles(client) -> set[str]:
    return {todo["title"] for todo in (await client.get(f"{LEAD}/todos")).json()["todos"]}


async def test_everyone_signed_in_reads_the_settings(client):
    assert (await client.get("/api/settings")).status_code == 401

    for user_id in ("u1", "u2", "u5"):
        await login(client, user_id)
        response = await client.get("/api/settings")
        assert response.json() == {"testToolsAvailable": True, "testForms": False}


async def test_only_admins_change_settings_or_reset_the_data(client):
    for user_id in ("u2", "u5"):
        await login(client, user_id)
        assert (await client.patch("/api/settings", json={"testForms": True})).status_code == 403
        assert (await client.post("/api/settings/reset-to-seed")).status_code == 403


async def test_the_switch_turns_the_test_forms_on_and_off(client):
    await login(client, "u2")
    assert (await client.post(f"{LEAD}/todos", json=NEW_TODO)).status_code == 403

    await login(client, "u1")
    response = await client.patch("/api/settings", json={"testForms": True})
    assert response.json() == {"testToolsAvailable": True, "testForms": True}

    await login(client, "u2")
    assert (await client.post(f"{LEAD}/todos", json=NEW_TODO)).status_code == 201

    await login(client, "u1")
    await client.patch("/api/settings", json={"testForms": False})

    await login(client, "u2")
    assert (await client.post(f"{LEAD}/todos", json=NEW_TODO)).status_code == 403


async def test_reset_restores_the_seed_but_keeps_the_switch(client):
    await login(client, "u1")
    await client.patch("/api/settings", json={"testForms": True})
    assert (await client.post(f"{LEAD}/todos", json=NEW_TODO)).status_code == 201
    assert (await client.post("/api/users", json=NEW_USER)).status_code == 201

    async with listening("team_lead", "team_sales") as sockets:
        assert (await client.post("/api/settings/reset-to-seed")).status_code == 204

    assert "Ring the bank" not in await todo_titles(client)
    emails = {user["email"] for user in (await client.get("/api/users")).json()}
    assert NEW_USER["email"] not in emails
    assert (await client.get("/api/settings")).json()["testForms"] is True
    for socket in sockets.values():
        assert socket.events == [{"type": "refresh"}]


async def test_adding_a_measurable_needs_the_test_forms(client):
    await login(client, "u2")
    measurable = {
        "name": "Qualified leads",
        "ownerId": "u3",
        "unit": "count",
        "goal": {"type": "at_least", "value": 25},
    }
    assert (await client.post(f"{LEAD}/measurables", json=measurable)).status_code == 403

    await login(client, "u1")
    await client.patch("/api/settings", json={"testForms": True})
    await login(client, "u2")
    assert (await client.post(f"{LEAD}/measurables", json=measurable)).status_code == 201
