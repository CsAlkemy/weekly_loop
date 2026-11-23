from contextlib import asynccontextmanager

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.realtime.hub import hub
from tests.conftest import login
from tests.test_todos import RecordingSocket

pytestmark = pytest.mark.usefixtures("test_forms_on")

LEAD = "/api/teams/team_lead"
AVERY, BLAKE, CASEY, DANA, ELLIS, FINLEY = "u1", "u2", "u3", "u4", "u5", "u6"


@asynccontextmanager
async def browsers(*user_ids: str):
    clients = []
    try:
        for user_id in user_ids:
            client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
            await login(client, user_id)
            clients.append(client)
        yield clients
    finally:
        for client in clients:
            await client.aclose()


@asynccontextmanager
async def listening(*team_ids: str):
    sockets = {team_id: RecordingSocket() for team_id in team_ids}
    for team_id, socket in sockets.items():
        hub.join(team_id, socket)
    try:
        yield sockets
    finally:
        for team_id, socket in sockets.items():
            hub.leave(team_id, socket)


def resources(socket: RecordingSocket) -> list[str]:
    return [event["resource"] for event in socket.events]


async def test_a_new_measurable_reaches_teammates_and_observers_but_not_other_teams(db):
    async with browsers(BLAKE, CASEY, ELLIS, FINLEY, AVERY) as (blake, casey, ellis, finley, avery):
        async with listening("team_lead", "team_sales") as sockets:
            created = await blake.post(
                f"{LEAD}/measurables",
                json={
                    "name": "Qualified leads",
                    "ownerId": CASEY,
                    "unit": "count",
                    "goal": {"type": "at_least", "value": 25},
                },
            )
            assert created.status_code == 201
            measurable_id = created.json()["id"]

            for reader in (casey, ellis, avery):
                names = [
                    m["name"] for m in (await reader.get(f"{LEAD}/scorecard")).json()["measurables"]
                ]
                assert "Qualified leads" in names
            assert (await finley.get(f"{LEAD}/scorecard")).status_code == 403

            score_url = f"{LEAD}/measurables/{measurable_id}/scores/2026-11-09"
            assert (await ellis.put(score_url, json={"value": 30})).status_code == 403
            scored = await casey.put(score_url, json={"value": 30})
            assert scored.json()["status"] == "on_track"

            seen_by_ellis = next(
                m
                for m in (await ellis.get(f"{LEAD}/scorecard")).json()["measurables"]
                if m["id"] == measurable_id
            )
            this_week = next(c for c in seen_by_ellis["cells"] if c["weekStart"] == "2026-11-09")
            assert this_week == {
                "weekStart": "2026-11-09",
                "value": 30.0,
                "status": "on_track",
                "issueId": None,
            }

        assert resources(sockets["team_lead"]) == ["scorecard", "scorecard"]
        assert resources(sockets["team_sales"]) == []


async def test_an_off_track_score_becomes_an_issue_then_to_dos_for_named_people(db):
    async with browsers(BLAKE, DANA, CASEY, ELLIS) as (blake, dana, casey, ellis):
        flagged = await blake.post(f"{LEAD}/measurables/m1/scores/2026-10-26/issue")
        assert flagged.status_code == 201
        issue = flagged.json()
        assert issue["owner"]["id"] == BLAKE
        assert issue["source"] == {
            "measurableId": "m1",
            "measurableName": "New deals closed",
            "weekStart": "2026-10-26",
        }
        assert (
            await ellis.post(f"{LEAD}/measurables/m1/scores/2026-10-26/issue")
        ).status_code == 403

        unsolved = {i["id"] for i in (await ellis.get(f"{LEAD}/issues")).json()}
        assert issue["id"] in unsolved
        cell = next(
            c
            for m in (await casey.get(f"{LEAD}/scorecard")).json()["measurables"]
            if m["id"] == "m1"
            for c in m["cells"]
            if c["weekStart"] == "2026-10-26"
        )
        assert cell["issueId"] == issue["id"]

        todo_url = f"{LEAD}/issues/{issue['id']}/todos"
        assert (
            await ellis.post(todo_url, json={"title": "X", "ownerId": CASEY})
        ).status_code == 403
        observer_owner = await dana.post(todo_url, json={"title": "X", "ownerId": ELLIS})
        assert observer_owner.status_code == 422
        for title, owner in (("Call the two stalled deals", CASEY), ("Fix the CRM report", DANA)):
            assert (
                await dana.post(todo_url, json={"title": title, "ownerId": owner})
            ).status_code == 201

        todos = (await ellis.get(f"{LEAD}/todos")).json()["todos"]
        linked = {
            t["title"]: t
            for t in todos
            if t["sourceIssue"] and t["sourceIssue"]["id"] == issue["id"]
        }
        assert linked["Call the two stalled deals"]["owner"]["id"] == CASEY
        assert linked["Fix the CRM report"]["owner"]["id"] == DANA
        assert {t["dueDate"] for t in linked.values()} == {"2026-11-18"}


async def test_ticking_a_to_do_counts_only_when_done_within_its_week(db, set_now):
    async with browsers(CASEY, ELLIS) as (casey, ellis):
        before = (await ellis.get(f"{LEAD}/todos")).json()["completion"]
        assert before == {"due": 10, "done": 9, "ratePercent": 90, "meetsTarget": True}

        last_week = await casey.post(
            f"{LEAD}/todos",
            json={"title": "Late report", "ownerId": CASEY, "dueDate": "2026-11-05"},
        )
        assert last_week.status_code == 201
        after_add = (await ellis.get(f"{LEAD}/todos")).json()["completion"]
        assert after_add == {"due": 11, "done": 9, "ratePercent": 82, "meetsTarget": False}

        ticked_late = await casey.post(f"{LEAD}/todos/{last_week.json()['id']}/done")
        assert ticked_late.json()["doneAt"] == "2026-11-11T15:00:00Z"
        after_late = (await ellis.get(f"{LEAD}/todos")).json()["completion"]
        assert after_late == after_add

        this_week = await casey.post(
            f"{LEAD}/todos",
            json={"title": "On-time task", "ownerId": CASEY, "dueDate": "2026-11-12"},
        )
        this_week_id = this_week.json()["id"]

        set_now("2026-11-16T15:00:00+00:00")
        untouched = (await ellis.get(f"{LEAD}/todos")).json()
        assert untouched["lastClosedWeek"] == "2026-11-09"

        set_now("2026-11-11T15:00:00+00:00")
        assert (await ellis.post(f"{LEAD}/todos/{this_week_id}/done")).status_code == 403
        await casey.post(f"{LEAD}/todos/{this_week_id}/done")

        set_now("2026-11-16T15:00:00+00:00")
        counted = (await ellis.get(f"{LEAD}/todos")).json()["completion"]
        assert counted["due"] == untouched["completion"]["due"]
        assert counted["done"] == untouched["completion"]["done"] + 1


async def test_a_rocks_status_and_progress_follow_its_milestones(db):
    async with browsers(AVERY, DANA, ELLIS, FINLEY) as (avery, dana, ellis, finley):
        async with listening("team_lead", "team_sales") as sockets:
            created = await avery.post(
                f"{LEAD}/rocks",
                json={
                    "title": "Open the Austin office",
                    "ownerId": DANA,
                    "milestones": [
                        {"title": "Lease signed", "dueDate": "2026-11-10"},
                        {"title": "Team hired", "dueDate": "2026-12-15"},
                    ],
                },
            )
            assert created.status_code == 201
            rock = created.json()
            assert (rock["status"], rock["progressPercent"], rock["quarter"]) == (
                "off_track",
                0,
                "2026-Q4",
            )
            lease, hired = rock["milestones"]
            assert lease["pastDue"] is True and hired["pastDue"] is False

            seen = {r["id"]: r for r in (await ellis.get(f"{LEAD}/rocks")).json()}
            assert seen[rock["id"]]["owner"]["id"] == DANA
            assert (await finley.get(f"{LEAD}/rocks")).status_code == 403

            done_url = f"{LEAD}/rocks/{rock['id']}/milestones/{lease['id']}/done"
            assert (await ellis.put(done_url)).status_code == 403
            ticked = (await dana.put(done_url)).json()
            assert (ticked["status"], ticked["progressPercent"]) == ("on_track", 50)

            hired_url = f"{LEAD}/rocks/{rock['id']}/milestones/{hired['id']}/done"
            assert (await dana.put(hired_url)).json()["progressPercent"] == 100
            undone = (await dana.delete(done_url)).json()
            assert (undone["status"], undone["progressPercent"]) == ("off_track", 50)

            other_team = f"/api/teams/team_sales/rocks/{rock['id']}/milestones/{lease['id']}/done"
            assert (await avery.put(other_team)).status_code == 404

        assert set(resources(sockets["team_lead"])) == {"rocks"}
        assert resources(sockets["team_sales"]) == []


async def test_a_meeting_records_who_was_there_and_what_they_changed(db):
    async with browsers(BLAKE, DANA, CASEY, ELLIS, FINLEY) as (blake, dana, casey, ellis, finley):
        assert (await ellis.post(f"{LEAD}/meeting")).status_code == 403
        assert (await blake.post(f"{LEAD}/meeting")).status_code == 201
        for person in (dana, casey, ellis):
            assert (await person.post(f"{LEAD}/meeting/join")).status_code == 200
        assert (await finley.post(f"{LEAD}/meeting/join")).status_code == 403
        assert (await dana.post(f"{LEAD}/meeting/advance")).status_code == 403
        assert (await blake.post(f"{LEAD}/meeting/advance")).status_code == 200

        solved = await dana.post(f"{LEAD}/issues/i3/solve", json={"note": "Weekend rota agreed."})
        assert solved.status_code == 200
        added = await dana.post(
            f"{LEAD}/issues/i1/todos", json={"title": "Post the job ad", "ownerId": CASEY}
        )
        assert added.status_code == 201

        await blake.post(f"{LEAD}/meeting/advance")
        assert (await blake.put(f"{LEAD}/meeting/rating", json={"rating": 8})).status_code == 200
        assert (await casey.put(f"{LEAD}/meeting/rating", json={"rating": 9})).status_code == 200
        assert (await ellis.put(f"{LEAD}/meeting/rating", json={"rating": 10})).status_code == 403
        assert (await dana.post(f"{LEAD}/meeting/end")).status_code == 403
        ended = await blake.post(f"{LEAD}/meeting/end")
        assert ended.status_code == 200

        meeting_id = (await ellis.get(f"{LEAD}/meeting")).json()["lastEndedMeetingId"]
        summary = (await ellis.get(f"{LEAD}/meetings/{meeting_id}/summary")).json()
        assert [issue["id"] for issue in summary["issuesSolved"]] == ["i3"]
        assert [todo["title"] for todo in summary["todosCreated"]] == ["Post the job ad"]
        assert {a["id"] for a in summary["attendees"]} == {BLAKE, DANA, CASEY, ELLIS}
        assert summary["rating"] == 8.5
        assert (await finley.get(f"{LEAD}/meetings/{meeting_id}/summary")).status_code == 403
