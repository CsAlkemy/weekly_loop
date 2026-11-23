from tests.conftest import login

URL = "/api/teams/team_lead/rocks"


async def rocks_by_id(client, url: str = URL) -> dict:
    response = await client.get(url)
    assert response.status_code == 200
    return {rock["id"]: rock for rock in response.json()}


async def test_rocks_show_owner_status_and_progress(client):
    await login(client, "u2")
    rocks = await rocks_by_id(client)

    assert list(rocks) == ["r1", "r2", "r3", "r4", "r5"]
    assert {key: (rock["status"], rock["progressPercent"]) for key, rock in rocks.items()} == {
        "r1": ("on_track", 33),
        "r2": ("off_track", 13),
        "r3": ("complete", 100),
        "r4": ("off_track", 0),
        "r5": ("on_track", 0),
    }
    assert rocks["r1"]["title"] == "Launch partner portal"
    assert rocks["r1"]["owner"]["name"] == "Blake Brooks"
    assert rocks["r1"]["quarter"] == "2026-Q4"


async def test_milestones_are_listed_by_due_date_with_past_due_flags(client):
    await login(client, "u2")
    rocks = await rocks_by_id(client)

    milestones = rocks["r2"]["milestones"]
    assert [milestone["id"] for milestone in milestones] == [
        "ms4",
        "ms5",
        "ms6",
        "ms7",
        "ms8",
        "ms9",
        "ms10",
        "ms11",
    ]
    assert milestones[0] == {
        "id": "ms4",
        "title": "Job description approved",
        "dueDate": "2026-10-10",
        "done": True,
        "pastDue": False,
    }
    assert milestones[1]["pastDue"] is True
    assert rocks["r3"]["milestones"] == []


async def test_milestone_due_today_is_not_past_due_until_tomorrow(client, set_now):
    await login(client, "u2")
    portal_beta = (await rocks_by_id(client))["r1"]["milestones"][1]
    assert (portal_beta["id"], portal_beta["pastDue"]) == ("ms2", False)

    set_now("2026-11-12T15:00:00Z")
    rock = (await rocks_by_id(client))["r1"]
    assert rock["status"] == "off_track"
    assert rock["milestones"][1]["pastDue"] is True


async def test_only_the_current_quarters_rocks_are_listed(client, set_now):
    await login(client, "u2")
    set_now("2027-01-05T15:00:00Z")
    assert await rocks_by_id(client) == {}


async def test_observer_can_read_rocks(client):
    await login(client, "u5")
    assert len(await rocks_by_id(client)) == 5


async def test_admin_can_read_any_teams_rocks(client):
    await login(client, "u1")
    assert list(await rocks_by_id(client, "/api/teams/team_ops/rocks")) == ["r7"]


async def test_rocks_of_another_team_are_refused(client):
    await login(client, "u6")
    assert (await client.get(URL)).status_code == 403


async def test_rocks_need_a_signed_in_user(client):
    assert (await client.get(URL)).status_code == 401
