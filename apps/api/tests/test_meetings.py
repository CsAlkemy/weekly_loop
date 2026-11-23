import asyncio

from httpx import ASGITransport, AsyncClient

from app.main import app
from app.realtime.hub import hub
from tests.conftest import login
from tests.test_todos import RecordingSocket

BASE = "/api/teams/team_lead"
MEETING = f"{BASE}/meeting"


async def other_client(user_id: str) -> AsyncClient:
    client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    await login(client, user_id)
    return client


async def active(client) -> dict | None:
    response = await client.get(MEETING)
    assert response.status_code == 200
    return response.json()["meeting"]


async def test_no_meeting_in_progress_on_the_seed(client):
    await login(client, "u2")
    body = (await client.get(MEETING)).json()

    assert body == {"meeting": None, "lastEndedMeetingId": "mt2"}


async def test_starting_a_meeting_makes_the_starter_facilitator(client):
    await login(client, "u2")
    response = await client.post(MEETING)
    meeting = response.json()

    assert response.status_code == 201
    assert meeting["facilitator"]["id"] == "u2"
    assert meeting["section"] == "scorecard"
    assert meeting["startedAt"] == "2026-11-11T15:00:00Z"
    assert meeting["sectionStartedAt"] == "2026-11-11T15:00:00Z"
    assert meeting["serverNow"] == "2026-11-11T15:00:00Z"
    assert meeting["scorecardWeek"] == "2026-11-02"
    assert meeting["agenda"] == [
        {"section": "scorecard", "label": "Scorecard", "minutes": 5},
        {"section": "ids", "label": "IDS", "minutes": 60},
        {"section": "conclude", "label": "Conclude", "minutes": 10},
    ]
    assert [user["id"] for user in meeting["attendees"]] == ["u2"]
    assert meeting["ratings"] == []
    assert meeting["averageRating"] is None
    assert (await active(client))["id"] == meeting["id"]


async def test_only_one_meeting_per_team_can_be_active(client):
    await login(client, "u2")
    await client.post(MEETING)
    second = await client.post(MEETING)

    assert second.status_code == 409


async def test_concurrent_starts_leave_one_meeting(client):
    clients = [await other_client(user_id) for user_id in ("u1", "u2", "u3", "u4")]
    try:
        responses = await asyncio.gather(*(other.post(MEETING) for other in clients))
    finally:
        for other in clients:
            await other.aclose()

    assert sorted(response.status_code for response in responses) == [201, 409, 409, 409]


async def test_different_teams_can_meet_at_the_same_time(client):
    await login(client, "u2")

    assert (await client.post(MEETING)).status_code == 201
    assert (await client.post("/api/teams/team_sales/meeting")).status_code == 201


async def test_observer_cannot_start_but_can_join(client):
    await login(client, "u5")
    assert (await client.post(MEETING)).status_code == 403
    assert (await client.post(f"{MEETING}/join")).status_code == 404

    facilitator = await other_client("u2")
    try:
        await facilitator.post(MEETING)
    finally:
        await facilitator.aclose()

    joined = await client.post(f"{MEETING}/join")
    assert joined.status_code == 200
    assert [user["id"] for user in joined.json()["attendees"]] == ["u2", "u5"]
    again = await client.post(f"{MEETING}/join")
    assert [user["id"] for user in again.json()["attendees"]] == ["u2", "u5"]


async def test_only_the_facilitator_advances_through_the_agenda(client, set_now):
    await login(client, "u2")
    await client.post(MEETING)
    member = await other_client("u3")
    try:
        await member.post(f"{MEETING}/join")
        assert (await member.post(f"{MEETING}/advance")).status_code == 403
    finally:
        await member.aclose()

    set_now("2026-11-11T15:07:00Z")
    ids = await client.post(f"{MEETING}/advance")
    assert ids.json()["section"] == "ids"
    assert ids.json()["sectionStartedAt"] == "2026-11-11T15:07:00Z"
    assert ids.json()["startedAt"] == "2026-11-11T15:00:00Z"

    set_now("2026-11-11T16:20:00Z")
    conclude = await client.post(f"{MEETING}/advance")
    assert conclude.json()["section"] == "conclude"
    assert (await client.post(f"{MEETING}/advance")).status_code == 409


async def test_the_server_owns_the_timer_and_an_overrun_does_not_advance(client, set_now):
    await login(client, "u2")
    await client.post(MEETING)

    set_now("2026-11-11T15:12:30Z")
    meeting = await active(client)

    assert meeting["section"] == "scorecard"
    assert meeting["sectionStartedAt"] == "2026-11-11T15:00:00Z"
    assert meeting["serverNow"] == "2026-11-11T15:12:30Z"


async def test_ratings_open_in_conclude_for_attending_writers(client):
    await login(client, "u2")
    await client.post(MEETING)
    assert (await client.put(f"{MEETING}/rating", json={"rating": 8})).status_code == 409

    await client.post(f"{MEETING}/advance")
    await client.post(f"{MEETING}/advance")
    rated = await client.put(f"{MEETING}/rating", json={"rating": 8})
    assert rated.status_code == 200
    assert rated.json()["ratings"] == [{"userId": "u2", "rating": 8}]

    changed = await client.put(f"{MEETING}/rating", json={"rating": 9})
    assert changed.json()["ratings"] == [{"userId": "u2", "rating": 9}]
    assert changed.json()["averageRating"] == 9.0

    assert (await client.put(f"{MEETING}/rating", json={"rating": 0})).status_code == 422
    assert (await client.put(f"{MEETING}/rating", json={"rating": 11})).status_code == 422
    assert (await client.put(f"{MEETING}/rating", json={"rating": 7.5})).status_code == 422


async def test_observers_and_non_attendees_cannot_rate(client):
    await login(client, "u2")
    await client.post(MEETING)
    await client.post(f"{MEETING}/advance")
    await client.post(f"{MEETING}/advance")

    observer, absent = await other_client("u5"), await other_client("u3")
    try:
        await observer.post(f"{MEETING}/join")
        assert (await observer.put(f"{MEETING}/rating", json={"rating": 9})).status_code == 403
        assert (await absent.put(f"{MEETING}/rating", json={"rating": 9})).status_code == 409
    finally:
        await observer.aclose()
        await absent.aclose()

    assert (await active(client))["ratings"] == []


async def test_only_the_facilitator_ends_the_meeting_at_any_time(client):
    await login(client, "u2")
    await client.post(MEETING)
    member = await other_client("u3")
    try:
        await member.post(f"{MEETING}/join")
        assert (await member.post(f"{MEETING}/end")).status_code == 403
    finally:
        await member.aclose()

    ended = await client.post(f"{MEETING}/end")
    assert ended.status_code == 200
    body = (await client.get(MEETING)).json()
    assert body == {"meeting": None, "lastEndedMeetingId": ended.json()["id"]}
    assert (await client.post(f"{MEETING}/end")).status_code == 404
    assert (await client.post(MEETING)).status_code == 201


async def test_summary_covers_what_happened_during_the_meeting(client, set_now):
    await login(client, "u2")
    before = await client.post(f"{BASE}/issues/i3/todos", json={"title": "Before", "ownerId": "u3"})

    set_now("2026-11-11T15:10:00Z")
    meeting = (await client.post(MEETING)).json()
    member, observer = await other_client("u3"), await other_client("u5")
    try:
        await member.post(f"{MEETING}/join")
        await observer.post(f"{MEETING}/join")

        set_now("2026-11-11T15:20:00Z")
        await client.post(f"{MEETING}/advance")
        await client.post(f"{BASE}/issues/i3/solve", json={"note": "Hired a weekend agent."})
        todo = await client.post(
            f"{BASE}/issues/i3/todos", json={"title": "Onboard the agent", "ownerId": "u4"}
        )

        set_now("2026-11-11T16:15:00Z")
        await client.post(f"{MEETING}/advance")
        await client.put(f"{MEETING}/rating", json={"rating": 8})
        await member.put(f"{MEETING}/rating", json={"rating": 9})

        set_now("2026-11-11T16:25:00Z")
        ended = await client.post(f"{MEETING}/end")

        set_now("2026-11-11T16:40:00Z")
        await client.post(f"{BASE}/issues/i1/solve", json={"note": "After the meeting."})
        summary = (await member.get(f"{BASE}/meetings/{meeting['id']}/summary")).json()
    finally:
        await member.aclose()
        await observer.aclose()

    assert ended.json() == summary
    assert summary["id"] == meeting["id"]
    assert summary["facilitator"]["id"] == "u2"
    assert summary["startedAt"] == "2026-11-11T15:10:00Z"
    assert summary["endedAt"] == "2026-11-11T16:25:00Z"
    assert summary["scorecardWeek"] == "2026-11-02"
    assert {m["id"]: m["status"] for m in summary["measurables"]} == {
        "m1": "off_track",
        "m2": "on_track",
        "m3": "off_track",
        "m4": "on_track",
        "m5": "off_track",
    }
    assert summary["issuesSolved"] == [
        {
            "id": "i3",
            "title": "Support coverage on weekends",
            "resolutionNote": "Hired a weekend agent.",
        }
    ]
    assert [item["id"] for item in summary["todosCreated"]] == [todo.json()["id"]]
    assert before.json()["id"] not in [item["id"] for item in summary["todosCreated"]]
    assert summary["todosCreated"][0]["owner"]["id"] == "u4"
    assert summary["todosCreated"][0]["dueDate"] == "2026-11-18"
    assert [user["id"] for user in summary["attendees"]] == ["u2", "u3", "u5"]
    assert summary["rating"] == 8.5
    assert summary["ratingsCount"] == 2


async def test_seeded_meeting_summaries_are_available(client):
    await login(client, "u5")
    first = (await client.get(f"{BASE}/meetings/mt1/summary")).json()
    second = (await client.get(f"{BASE}/meetings/mt2/summary")).json()

    assert first["scorecardWeek"] == "2026-10-19"
    assert [m["status"] for m in first["measurables"]] == ["on_track"] * 4 + ["off_track"]
    assert first["measurables"][4]["value"] is None
    assert [issue["id"] for issue in first["issuesSolved"]] == ["i7"]
    assert [todo["id"] for todo in first["todosCreated"]] == ["t20"]
    assert [user["id"] for user in first["attendees"]] == ["u1", "u2", "u3", "u4", "u5"]
    assert (first["rating"], first["ratingsCount"]) == (8.0, 3)

    assert second["scorecardWeek"] == "2026-10-26"
    assert [issue["id"] for issue in second["issuesSolved"]] == ["i6"]
    assert [todo["id"] for todo in second["todosCreated"]] == ["t30"]
    assert (second["rating"], second["ratingsCount"]) == (8.3, 4)


async def test_meeting_without_ratings_has_no_score(client):
    await login(client, "u2")
    await client.post(MEETING)
    summary = (await client.post(f"{MEETING}/end")).json()

    assert summary["rating"] is None
    assert summary["ratingsCount"] == 0


async def test_summary_is_only_for_ended_meetings_of_this_team(client):
    await login(client, "u2")
    meeting = (await client.post(MEETING)).json()

    assert (await client.get(f"{BASE}/meetings/{meeting['id']}/summary")).status_code == 404
    assert (await client.get(f"{BASE}/meetings/nope/summary")).status_code == 404
    assert (await client.get("/api/teams/team_sales/meetings/mt1/summary")).status_code == 404


async def test_another_teams_meeting_is_refused(client):
    await login(client, "u6")

    assert (await client.get(MEETING)).status_code == 403
    assert (await client.post(MEETING)).status_code == 403
    assert (await client.post(f"{MEETING}/join")).status_code == 403
    assert (await client.get(f"{BASE}/meetings/mt1/summary")).status_code == 403


async def test_admin_can_facilitate_any_team(client):
    await login(client, "u1")
    response = await client.post("/api/teams/team_ops/meeting")

    assert response.status_code == 201
    assert response.json()["facilitator"]["id"] == "u1"


async def test_meeting_needs_a_signed_in_user(client):
    assert (await client.get(MEETING)).status_code == 401
    assert (await client.post(MEETING)).status_code == 401


async def test_meeting_changes_are_published_to_the_team(client):
    socket = RecordingSocket()
    hub.join("team_lead", socket)
    try:
        await login(client, "u2")
        await client.post(MEETING)
        await client.post(f"{MEETING}/join")
        await client.post(f"{MEETING}/advance")
        await client.post(f"{MEETING}/advance")
        await client.put(f"{MEETING}/rating", json={"rating": 8})
        await client.post(f"{MEETING}/end")
    finally:
        hub.leave("team_lead", socket)

    assert socket.events == [{"type": "invalidate", "resource": "meeting"}] * 6
