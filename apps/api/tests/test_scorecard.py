import asyncio

from app.realtime.hub import hub
from tests.conftest import login
from tests.test_todos import RecordingSocket

URL = "/api/teams/team_lead/scorecard"
SYMBOLS = {"on_track": "+", "off_track": "-", "pending": "?"}


def score_url(measurable_id: str, week: str, team_id: str = "team_lead") -> str:
    return f"/api/teams/{team_id}/measurables/{measurable_id}/scores/{week}"


async def scorecard(client, url: str = URL) -> dict:
    response = await client.get(url)
    assert response.status_code == 200
    return response.json()


def rows(body: dict) -> dict:
    return {measurable["id"]: measurable for measurable in body["measurables"]}


def statuses(measurable: dict) -> str:
    return "".join(SYMBOLS[cell["status"]] for cell in measurable["cells"])


def cell(measurable: dict, week: str) -> dict:
    return next(cell for cell in measurable["cells"] if cell["weekStart"] == week)


async def test_scorecard_covers_13_weeks_ending_with_the_current_one(client):
    await login(client, "u2")
    body = await scorecard(client)

    assert len(body["weeks"]) == 13
    assert (body["weeks"][0], body["weeks"][-1]) == ("2026-08-17", "2026-11-09")
    assert body["currentWeek"] == "2026-11-09"
    assert body["lastClosedWeek"] == "2026-11-02"
    assert list(rows(body)) == ["m1", "m2", "m3", "m4", "m5"]
    for measurable in body["measurables"]:
        assert [cell["weekStart"] for cell in measurable["cells"]] == body["weeks"]


async def test_measurables_show_name_owner_unit_and_goal(client):
    await login(client, "u2")
    measurables = rows(await scorecard(client))

    assert measurables["m1"]["name"] == "New deals closed"
    assert measurables["m1"]["owner"]["name"] == "Blake Brooks"
    assert measurables["m1"]["unit"] == "count"
    assert measurables["m1"]["goal"] == {"type": "at_least", "value": 10, "min": None, "max": None}
    assert measurables["m3"]["goal"] == {"type": "between", "value": None, "min": 2, "max": 4}
    assert measurables["m2"]["unit"] == "%"


async def test_each_cell_has_a_score_and_a_status(client):
    await login(client, "u2")
    measurables = rows(await scorecard(client))

    assert statuses(measurables["m1"]) == "++-++++-++--?"
    assert statuses(measurables["m2"]) == "++-++++-++++?"
    assert statuses(measurables["m3"]) == "+++--+++-++-?"
    assert statuses(measurables["m4"]) == "++-++-++++-+?"
    assert statuses(measurables["m5"]) == "+-++++-++-+-+"
    assert cell(measurables["m2"], "2026-08-17") == {
        "weekStart": "2026-08-17",
        "value": 2.1,
        "status": "on_track",
        "issueId": None,
    }


async def test_missing_scores_are_off_track_when_closed_and_pending_when_current(client):
    await login(client, "u2")
    measurables = rows(await scorecard(client))

    assert cell(measurables["m5"], "2026-10-19") == {
        "weekStart": "2026-10-19",
        "value": None,
        "status": "off_track",
        "issueId": None,
    }
    assert cell(measurables["m1"], "2026-11-09")["status"] == "pending"
    assert cell(measurables["m5"], "2026-11-09") == {
        "weekStart": "2026-11-09",
        "value": 520,
        "status": "on_track",
        "issueId": None,
    }


async def test_window_and_statuses_move_with_the_clock(client, set_now):
    await login(client, "u2")
    set_now("2026-11-18T15:00:00Z")
    body = await scorecard(client)

    assert (body["weeks"][0], body["weeks"][-1]) == ("2026-08-24", "2026-11-16")
    assert cell(rows(body)["m1"], "2026-11-09")["status"] == "off_track"
    assert cell(rows(body)["m1"], "2026-11-16")["status"] == "pending"


async def test_entering_a_score_sets_its_status(client):
    await login(client, "u2")
    response = await client.put(score_url("m1", "2026-11-09"), json={"value": 11, "expected": None})

    assert response.status_code == 200
    assert response.json() == {
        "weekStart": "2026-11-09",
        "value": 11,
        "status": "on_track",
        "issueId": None,
    }
    assert cell(rows(await scorecard(client))["m1"], "2026-11-09")["value"] == 11


async def test_a_save_based_on_the_value_last_seen_goes_through(client):
    await login(client, "u2")
    first = await client.put(score_url("m1", "2026-11-02"), json={"value": 12, "expected": 8})
    response = await client.put(score_url("m1", "2026-11-02"), json={"value": 7, "expected": 12})

    assert first.status_code == 200
    assert response.json()["status"] == "off_track"
    assert cell(rows(await scorecard(client))["m1"], "2026-11-02")["value"] == 7


async def test_a_save_based_on_a_stale_value_is_refused(client):
    await login(client, "u2")
    await client.put(score_url("m1", "2026-11-02"), json={"value": 12, "expected": 8})

    stale = await client.put(score_url("m1", "2026-11-02"), json={"value": 9, "expected": 8})
    assert stale.status_code == 409
    assert "changed this score to 12" in stale.json()["detail"]
    entered_twice = await client.put(
        score_url("m1", "2026-11-09"), json={"value": 4, "expected": None}
    )
    assert entered_twice.status_code == 200
    second = await client.put(score_url("m1", "2026-11-09"), json={"value": 5, "expected": None})
    assert second.status_code == 409
    stale_clear = await client.delete(score_url("m1", "2026-11-02"), params={"expected": 8})
    assert stale_clear.status_code == 409

    measurable = rows(await scorecard(client))["m1"]
    assert cell(measurable, "2026-11-02")["value"] == 12
    assert cell(measurable, "2026-11-09")["value"] == 4


async def test_two_saves_from_the_same_value_at_once_let_one_through(client):
    await login(client, "u2")
    url = score_url("m1", "2026-11-02")
    responses = await asyncio.gather(
        *(client.put(url, json={"value": 20 + n, "expected": 8}) for n in range(6))
    )

    assert sorted(r.status_code for r in responses) == [200] + [409] * 5


async def test_filling_a_missing_closed_week_clears_off_track(client):
    await login(client, "u4")
    response = await client.put(
        score_url("m5", "2026-10-19"), json={"value": 505, "expected": None}
    )

    assert response.json()["status"] == "on_track"


async def test_clearing_a_score_makes_the_week_pending_or_off_track(client):
    await login(client, "u4")
    current = await client.delete(score_url("m5", "2026-11-09"), params={"expected": 520})
    closed = await client.delete(score_url("m5", "2026-10-26"), params={"expected": 525})
    already_empty = await client.delete(score_url("m5", "2026-10-19"))

    assert current.json() == {
        "weekStart": "2026-11-09",
        "value": None,
        "status": "pending",
        "issueId": None,
    }
    assert closed.json() == {
        "weekStart": "2026-10-26",
        "value": None,
        "status": "off_track",
        "issueId": None,
    }
    assert already_empty.status_code == 200
    assert cell(rows(await scorecard(client))["m5"], "2026-10-26")["value"] is None


async def test_decimal_scores_are_compared_exactly_at_the_boundary(client):
    await login(client, "u3")
    on_goal = await client.put(score_url("m2", "2026-11-09"), json={"value": 3.0, "expected": None})
    just_over = await client.put(score_url("m2", "2026-11-02"), json={"value": 3.01, "expected": 3})

    assert on_goal.json()["status"] == "on_track"
    assert just_over.json() == {
        "weekStart": "2026-11-02",
        "value": 3.01,
        "status": "off_track",
        "issueId": None,
    }


async def test_invalid_scores_are_rejected(client):
    await login(client, "u2")

    not_monday = await client.put(
        score_url("m1", "2026-11-10"), json={"value": 5, "expected": None}
    )
    future_week = await client.put(
        score_url("m1", "2026-11-16"), json={"value": 5, "expected": None}
    )
    not_a_number = await client.put(
        score_url("m1", "2026-11-09"), json={"value": "many", "expected": None}
    )
    missing = await client.put(score_url("m1", "2026-11-09"), json={})
    too_precise = await client.put(
        score_url("m1", "2026-11-09"), json={"value": 1.123456, "expected": None}
    )
    not_a_date = await client.put(score_url("m1", "last-week"), json={"value": 5, "expected": None})

    assert not_monday.status_code == 422
    assert not_monday.json()["detail"] == "A week starts on a Monday"
    assert future_week.status_code == 422
    assert [r.status_code for r in (not_a_number, missing, too_precise, not_a_date)] == [422] * 4
    assert cell(rows(await scorecard(client))["m1"], "2026-11-09")["value"] is None


async def test_observer_can_read_but_not_enter_scores(client):
    await login(client, "u5")

    assert (await client.get(URL)).status_code == 200
    response = await client.put(score_url("m1", "2026-11-09"), json={"value": 11, "expected": None})
    assert response.status_code == 403
    assert (
        await client.delete(score_url("m1", "2026-11-02"), params={"expected": 8})
    ).status_code == 403
    measurable = rows(await scorecard(client))["m1"]
    assert cell(measurable, "2026-11-09")["value"] is None
    assert cell(measurable, "2026-11-02")["value"] == 8


async def test_another_teams_scorecard_is_refused(client):
    await login(client, "u6")

    assert (await client.get(URL)).status_code == 403
    response = await client.put(score_url("m1", "2026-11-09"), json={"value": 11, "expected": None})
    assert response.status_code == 403


async def test_measurable_from_another_team_is_not_found_through_my_team(client):
    await login(client, "u8")
    response = await client.put(
        score_url("m1", "2026-11-09", "team_ops"), json={"value": 11, "expected": None}
    )

    assert response.status_code == 404


async def test_admin_can_enter_scores_in_any_team(client):
    await login(client, "u1")
    response = await client.put(
        score_url("m7", "2026-11-09", "team_ops"), json={"value": 3, "expected": None}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "off_track"


async def test_scorecard_needs_a_signed_in_user(client):
    assert (await client.get(URL)).status_code == 401
    response = await client.put(score_url("m1", "2026-11-09"), json={"value": 11, "expected": None})
    assert response.status_code == 401


async def test_score_changes_are_published_to_the_team(client):
    socket = RecordingSocket()
    hub.join("team_lead", socket)
    try:
        await login(client, "u2")
        await client.put(score_url("m1", "2026-11-09"), json={"value": 11, "expected": None})
    finally:
        hub.leave("team_lead", socket)

    assert socket.events == [{"type": "invalidate", "resource": "scorecard"}]
