from datetime import UTC, datetime

from app.rules.report import build_report

SEED_NOW = datetime(2026, 11, 11, 15, 0, tzinfo=UTC)
WEEKS = [
    "2026-08-17",
    "2026-08-24",
    "2026-08-31",
    "2026-09-07",
    "2026-09-14",
    "2026-09-21",
    "2026-09-28",
    "2026-10-05",
    "2026-10-12",
    "2026-10-19",
    "2026-10-26",
    "2026-11-02",
    "2026-11-09",
]
SYMBOLS = {"on_track": "+", "off_track": "-", "pending": "?"}


def row(team: dict, measurable_id: str) -> str:
    return "".join(SYMBOLS[status] for status in team["measurable_status"][measurable_id].values())


async def test_report_covers_every_team_and_13_weeks(db):
    report = await build_report(db, SEED_NOW)

    assert report["now"] == "2026-11-11T15:00:00Z"
    assert list(report["teams"]) == ["team_lead", "team_ops", "team_sales"]
    for team in report["teams"].values():
        assert list(team["todo_completion"]) == WEEKS
        for by_week in team["measurable_status"].values():
            assert list(by_week) == WEEKS


async def test_measurable_statuses_on_the_seed(db):
    teams = (await build_report(db, SEED_NOW))["teams"]

    assert row(teams["team_lead"], "m1") == "++-++++-++--?"
    assert row(teams["team_lead"], "m2") == "++-++++-++++?"
    assert row(teams["team_lead"], "m3") == "+++--+++-++-?"
    assert row(teams["team_lead"], "m4") == "++-++-++++-+?"
    assert row(teams["team_lead"], "m5") == "+-++++-++-+-+"
    assert row(teams["team_sales"], "m6") == "+-+++-++-++-?"
    assert row(teams["team_ops"], "m7") == "+-+++-++-+++?"


async def test_todo_completion_on_the_seed(db):
    teams = (await build_report(db, SEED_NOW))["teams"]
    lead = teams["team_lead"]["todo_completion"]

    assert lead["2026-09-14"] == {"due": 2, "done": 2, "rate_percent": 100, "meets_target": True}
    assert lead["2026-10-26"] == {"due": 3, "done": 2, "rate_percent": 67, "meets_target": False}
    assert lead["2026-11-02"] == {"due": 10, "done": 9, "rate_percent": 90, "meets_target": True}
    assert lead["2026-11-09"] == {"due": 3, "done": 0, "rate_percent": 0, "meets_target": False}
    assert lead["2026-10-19"] is None
    assert sum(1 for value in lead.values() if value is None) == 9

    assert teams["team_ops"]["todo_completion"]["2026-11-02"]["rate_percent"] == 100
    assert teams["team_sales"]["todo_completion"]["2026-11-09"]["rate_percent"] == 0


async def test_overdue_rocks_and_issue_order_on_the_seed(db):
    teams = (await build_report(db, SEED_NOW))["teams"]
    lead = teams["team_lead"]

    assert lead["overdue_todos"] == ["t12", "t31"]
    assert teams["team_sales"]["overdue_todos"] == []
    assert lead["rocks"] == {
        "r1": {"status": "on_track", "progress_percent": 33},
        "r2": {"status": "off_track", "progress_percent": 13},
        "r3": {"status": "complete", "progress_percent": 100},
        "r4": {"status": "off_track", "progress_percent": 0},
        "r5": {"status": "on_track", "progress_percent": 0},
    }
    assert teams["team_sales"]["rocks"] == {"r6": {"status": "on_track", "progress_percent": 0}}
    assert lead["issue_order"] == ["i2", "i1", "i5", "i3", "i4"]
    assert teams["team_ops"]["issue_order"] == ["i9"]


async def test_meeting_summaries_on_the_seed(db):
    meetings = (await build_report(db, SEED_NOW))["teams"]["team_lead"]["meetings"]

    assert meetings["mt1"] == {
        "scorecard_week": "2026-10-19",
        "measurable_status": {
            "m1": "on_track",
            "m2": "on_track",
            "m3": "on_track",
            "m4": "on_track",
            "m5": "off_track",
        },
        "issues_solved": ["i7"],
        "todos_created": ["t20"],
        "attendee_ids": ["u1", "u2", "u3", "u4", "u5"],
        "rating": 8.0,
    }
    assert meetings["mt2"] == {
        "scorecard_week": "2026-10-26",
        "measurable_status": {
            "m1": "off_track",
            "m2": "on_track",
            "m3": "on_track",
            "m4": "off_track",
            "m5": "on_track",
        },
        "issues_solved": ["i6"],
        "todos_created": ["t30"],
        "attendee_ids": ["u1", "u2", "u3", "u4", "u5"],
        "rating": 8.3,
    }


async def test_report_moves_with_the_clock(db):
    a_week_later = datetime(2026, 11, 18, 15, 0, tzinfo=UTC)
    teams = (await build_report(db, a_week_later))["teams"]
    lead = teams["team_lead"]

    assert list(lead["todo_completion"])[0] == "2026-08-24"
    assert list(lead["todo_completion"])[-1] == "2026-11-16"
    assert lead["measurable_status"]["m1"]["2026-11-09"] == "off_track"
    assert lead["measurable_status"]["m1"]["2026-11-16"] == "pending"
    assert lead["measurable_status"]["m5"]["2026-11-09"] == "on_track"
    assert lead["overdue_todos"] == ["t12", "t30", "t31", "t32"]
    assert teams["team_sales"]["overdue_todos"] == ["t40"]
    assert lead["rocks"]["r1"] == {"status": "off_track", "progress_percent": 33}


async def test_today_follows_company_time_near_midnight(db):
    sunday_2330_chicago = datetime(2026, 11, 16, 5, 30, tzinfo=UTC)
    lead = (await build_report(db, sunday_2330_chicago))["teams"]["team_lead"]

    assert list(lead["todo_completion"])[-1] == "2026-11-09"
    assert lead["overdue_todos"] == ["t12", "t30", "t31", "t32"]

    monday_0030_chicago = datetime(2026, 11, 16, 6, 30, tzinfo=UTC)
    lead = (await build_report(db, monday_0030_chicago))["teams"]["team_lead"]
    assert list(lead["todo_completion"])[-1] == "2026-11-16"
