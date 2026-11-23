from app.config.env import settings
from tests.conftest import login

NEW_USER = {
    "name": "Jordan Jones",
    "email": "jordan@acme.test",
    "role": "team_member",
    "password": "jordan-password",
    "teamIds": ["team_sales"],
}


async def sign_in(client, email: str, password: str):
    return await client.post("/api/auth/login", json={"email": email, "password": password})


async def test_signed_out_and_non_admins_cannot_manage_users(client):
    assert (await client.get("/api/users")).status_code == 401

    for user_id in ("u2", "u5"):
        await login(client, user_id)
        assert (await client.get("/api/users")).status_code == 403
        assert (await client.post("/api/users", json=NEW_USER)).status_code == 403
        assert (await client.patch("/api/users/u3", json={"name": "X"})).status_code == 403


async def test_admin_lists_every_user_with_their_teams(client):
    await login(client, "u1")
    users = (await client.get("/api/users")).json()

    assert len(users) == 9
    blake = next(user for user in users if user["id"] == "u2")
    assert blake["teamIds"] == ["team_lead", "team_sales"]
    assert blake["role"] == "team_member"


async def test_a_created_user_signs_in_and_sees_only_their_teams(client):
    await login(client, "u1")
    response = await client.post("/api/users", json={**NEW_USER, "email": " Jordan@ACME.test "})
    assert response.status_code == 201
    assert response.json()["email"] == "jordan@acme.test"
    assert response.json()["teamIds"] == ["team_sales"]

    assert (await sign_in(client, "jordan@acme.test", "jordan-password")).status_code == 200
    teams = (await client.get("/api/teams")).json()
    assert [team["id"] for team in teams] == ["team_sales"]
    assert (await client.get("/api/teams/team_lead")).status_code == 403


async def test_create_rejects_bad_input(client):
    await login(client, "u1")

    duplicate = await client.post("/api/users", json={**NEW_USER, "email": "BLAKE@acme.test"})
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "A user with this email already exists"

    unknown = await client.post("/api/users", json={**NEW_USER, "teamIds": ["team_nope"]})
    assert unknown.status_code == 422
    assert unknown.json()["detail"] == "Unknown team: team_nope"

    for bad in ({"password": "short"}, {"email": "not-an-email"}, {"name": "  "}, {"role": "boss"}):
        assert (await client.post("/api/users", json={**NEW_USER, **bad})).status_code == 422


async def test_a_role_change_applies_to_the_users_next_request(client):
    await login(client, "u1")
    assert (await client.patch("/api/users/u9", json={"role": "observer"})).status_code == 200

    await login(client, "u9")
    issue = {"title": "Anything", "priority": None}
    assert (await client.post("/api/teams/team_ops/issues", json=issue)).status_code == 403


async def test_an_owner_of_open_items_cannot_become_an_observer(client):
    await login(client, "u1")
    response = await client.patch("/api/users/u8", json={"role": "observer"})

    assert response.status_code == 409
    assert "Reassign them before making Harper Hill an Observer" in response.json()["detail"]


async def test_an_admin_cannot_change_their_own_role(client):
    await login(client, "u1")
    response = await client.patch("/api/users/u1", json={"role": "team_member"})

    assert response.status_code == 409
    assert response.json()["detail"] == "You cannot change your own role"


async def test_teams_are_replaced_unless_the_user_owns_items_there(client):
    await login(client, "u1")

    kept = await client.patch("/api/users/u2", json={"teamIds": ["team_lead", "team_ops"]})
    assert kept.status_code == 200
    assert kept.json()["teamIds"] == ["team_lead", "team_ops"]

    refused = await client.patch("/api/users/u2", json={"teamIds": ["team_ops"]})
    assert refused.status_code == 409
    assert "Reassign them first" in refused.json()["detail"]


async def test_admin_resets_a_password_and_changes_an_email(client):
    await login(client, "u1")
    response = await client.patch(
        "/api/users/u9", json={"password": "a-new-password", "email": "indy.ito@acme.test"}
    )
    assert response.status_code == 200

    assert (await sign_in(client, "indy@acme.test", settings.seed_password)).status_code == 401
    assert (await sign_in(client, "indy.ito@acme.test", "a-new-password")).status_code == 200


async def test_an_email_already_in_use_cannot_be_taken(client):
    await login(client, "u1")
    response = await client.patch("/api/users/u9", json={"email": "casey@acme.test"})

    assert response.status_code == 409


async def test_unknown_users_are_not_found(client):
    await login(client, "u1")
    assert (await client.patch("/api/users/u_nope", json={"name": "X"})).status_code == 404


async def test_a_password_reset_signs_the_user_out_everywhere(client):
    await login(client, "u9")
    indy_cookies = dict(client.cookies)

    await login(client, "u1")
    reset = await client.patch("/api/users/u9", json={"password": "a-new-password"})
    assert reset.status_code == 200

    client.cookies.clear()
    client.cookies.update(indy_cookies)
    assert (await client.get("/api/auth/me")).status_code == 401
    assert (await client.get("/api/teams")).status_code == 401


async def test_a_name_change_keeps_the_user_signed_in(client):
    await login(client, "u9")
    indy_cookies = dict(client.cookies)

    await login(client, "u1")
    assert (await client.patch("/api/users/u9", json={"name": "Indy Ito-Smith"})).status_code == 200

    client.cookies.clear()
    client.cookies.update(indy_cookies)
    assert (await client.get("/api/auth/me")).json()["name"] == "Indy Ito-Smith"
