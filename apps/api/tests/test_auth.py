from sqlalchemy import select

from app.auth.passwords import hash_password, verify_password
from app.config.env import settings
from app.db.models import User
from tests.conftest import login

AVERY = "avery@acme.test"


async def sign_in(client, email: str, password: str):
    return await client.post("/api/auth/login", json={"email": email, "password": password})


async def test_the_right_password_signs_the_user_in(client):
    response = await sign_in(client, AVERY, settings.seed_password)

    assert response.status_code == 200
    assert response.json() == {
        "id": "u1",
        "name": "Avery Admin",
        "email": AVERY,
        "role": "admin",
    }
    assert (await client.get("/api/auth/me")).json()["id"] == "u1"


async def test_email_is_matched_without_case_or_padding(client):
    response = await sign_in(client, "  Avery@ACME.test ", settings.seed_password)

    assert response.status_code == 200


async def test_a_wrong_password_is_refused(client):
    response = await sign_in(client, AVERY, "not-the-password")

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"
    assert (await client.get("/api/auth/me")).status_code == 401


async def test_an_unknown_email_gets_the_same_answer(client):
    response = await sign_in(client, "nobody@acme.test", settings.seed_password)

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


async def test_the_old_user_id_login_no_longer_works(client):
    response = await client.post("/api/auth/login", json={"userId": "u1"})

    assert response.status_code == 422


async def test_a_user_without_a_password_cannot_sign_in(client, db):
    user = await db.get(User, "u1")
    user.password_hash = None
    await db.commit()

    assert (await sign_in(client, AVERY, settings.seed_password)).status_code == 401


async def test_signing_in_replaces_the_previous_session(client):
    await login(client, "u2")
    await login(client, "u1")

    assert (await client.get("/api/auth/me")).json()["id"] == "u1"


async def test_logout_ends_the_session(client):
    await login(client, "u1")

    assert (await client.post("/api/auth/logout")).status_code == 204
    assert (await client.get("/api/auth/me")).status_code == 401


async def test_passwords_are_stored_hashed_and_never_returned(client, db):
    hashes = (await db.scalars(select(User.password_hash))).all()
    assert all(value and value.startswith("scrypt$") for value in hashes)
    assert settings.seed_password not in "".join(hashes)

    await login(client, "u1")
    assert "password" not in "".join((await client.get("/api/auth/me")).json())


def test_hashes_are_salted_and_verify_only_the_right_password():
    first, second = hash_password("correct horse"), hash_password("correct horse")

    assert first != second
    assert verify_password("correct horse", first)
    assert not verify_password("wrong horse", first)
    assert not verify_password("correct horse", None)


async def test_demo_accounts_list_the_seeded_users_and_their_password(client, db):
    await login(client, "u1")
    created = {
        "name": "Jordan Jones",
        "email": "jordan@acme.test",
        "role": "team_member",
        "password": "jordan-password",
        "teamIds": [],
    }
    assert (await client.post("/api/users", json=created)).status_code == 201
    await client.post("/api/auth/logout")

    response = await client.get("/api/auth/demo-accounts")

    assert response.status_code == 200
    emails = [user["email"] for user in response.json()["users"]]
    assert len(emails) == 9
    assert "jordan@acme.test" not in emails
    assert response.json()["password"] == settings.seed_password
    assert (await sign_in(client, emails[0], response.json()["password"])).status_code == 200


async def test_demo_accounts_can_be_turned_off(client, monkeypatch):
    monkeypatch.setattr(settings, "demo_accounts", False)

    assert (await client.get("/api/auth/demo-accounts")).status_code == 404


async def test_repeated_wrong_passwords_lock_that_email_for_a_while(client):
    for _ in range(settings.login_attempts):
        assert (await sign_in(client, AVERY, "not-the-password")).status_code == 401

    locked = await sign_in(client, AVERY, settings.seed_password)
    assert locked.status_code == 429
    assert "Too many failed sign-ins" in locked.json()["detail"]
    assert (await sign_in(client, "blake@acme.test", settings.seed_password)).status_code == 200


async def test_a_successful_sign_in_clears_earlier_failures(client):
    for _ in range(settings.login_attempts - 1):
        await sign_in(client, AVERY, "not-the-password")
    assert (await sign_in(client, AVERY, settings.seed_password)).status_code == 200

    for _ in range(settings.login_attempts - 1):
        await sign_in(client, AVERY, "not-the-password")
    assert (await sign_in(client, AVERY, settings.seed_password)).status_code == 200
