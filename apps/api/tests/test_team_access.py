from app.db.models import Company, Team
from tests.conftest import login


async def test_signed_out_requests_are_refused(client):
    assert (await client.get("/api/teams")).status_code == 401
    assert (await client.get("/api/teams/team_lead")).status_code == 401


async def test_team_member_lists_only_their_teams(client):
    await login(client, "u2")
    response = await client.get("/api/teams")
    assert [team["id"] for team in response.json()] == ["team_lead", "team_sales"]


async def test_team_member_reading_another_team_is_refused(client):
    await login(client, "u6")
    assert (await client.get("/api/teams/team_sales")).status_code == 200
    assert (await client.get("/api/teams/team_lead")).status_code == 403


async def test_guessed_team_id_is_refused_for_non_admins(client):
    await login(client, "u6")
    assert (await client.get("/api/teams/team_unknown")).status_code == 403


async def test_admin_can_open_every_team(client):
    await login(client, "u1")
    response = await client.get("/api/teams")
    assert [team["id"] for team in response.json()] == ["team_lead", "team_ops", "team_sales"]
    assert (await client.get("/api/teams/team_ops")).status_code == 200
    assert (await client.get("/api/teams/team_unknown")).status_code == 404


async def test_admin_cannot_open_another_companys_team(client, db):
    db.add(Company(id="co_2", name="Other Co", timezone="Europe/London"))
    await db.flush()
    db.add(Team(id="team_other", company_id="co_2", name="Other team"))
    await db.commit()

    await login(client, "u1")
    teams = [team["id"] for team in (await client.get("/api/teams")).json()]
    assert "team_other" not in teams
    assert (await client.get("/api/teams/team_other")).status_code == 403
    assert (await client.get("/api/teams/team_other/issues")).status_code == 403


async def test_observer_can_read_their_team(client):
    await login(client, "u5")
    response = await client.get("/api/teams/team_lead")
    assert response.status_code == 200
    body = response.json()
    assert body["timezone"] == "America/Chicago"
    assert [member["id"] for member in body["members"]] == ["u1", "u2", "u3", "u4", "u5"]


async def test_logout_ends_the_session(client):
    await login(client, "u2")
    assert (await client.post("/api/auth/logout")).status_code == 204
    assert (await client.get("/api/auth/me")).status_code == 401


async def test_seed_reset_route_is_not_mounted_by_default(client):
    await login(client, "u1")
    assert (await client.post("/api/testing/reset")).status_code == 404
