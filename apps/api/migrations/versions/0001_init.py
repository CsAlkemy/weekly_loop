"""init

Revision ID: 0001
Revises:
"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("timezone", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_companies")),
    )
    op.create_table(
        "teams",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("company_id", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(
            ["company_id"], ["companies.id"], name=op.f("fk_teams_company_id_companies")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_teams")),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("company_id", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "role IN ('admin', 'team_member', 'observer')", name=op.f("ck_users_role")
        ),
        sa.ForeignKeyConstraint(
            ["company_id"], ["companies.id"], name=op.f("fk_users_company_id_companies")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )
    op.create_table(
        "measurables",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("team_id", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("owner_id", sa.Text(), nullable=False),
        sa.Column("unit", sa.Text(), nullable=False),
        sa.Column("goal_type", sa.Text(), nullable=False),
        sa.Column("goal_value", sa.Numeric(), nullable=True),
        sa.Column("goal_min", sa.Numeric(), nullable=True),
        sa.Column("goal_max", sa.Numeric(), nullable=True),
        sa.CheckConstraint(
            "(goal_type = 'between' AND goal_value IS NULL AND goal_min IS NOT NULL AND goal_max IS NOT NULL AND goal_min <= goal_max) OR (goal_type <> 'between' AND goal_value IS NOT NULL AND goal_min IS NULL AND goal_max IS NULL)",
            name=op.f("ck_measurables_goal_shape"),
        ),
        sa.CheckConstraint(
            "goal_type IN ('at_least', 'at_most', 'between', 'exactly')",
            name=op.f("ck_measurables_goal_type"),
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["users.id"], name=op.f("fk_measurables_owner_id_users")
        ),
        sa.ForeignKeyConstraint(
            ["team_id"], ["teams.id"], name=op.f("fk_measurables_team_id_teams")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_measurables")),
        sa.UniqueConstraint("id", "team_id", name=op.f("uq_measurables_id")),
    )
    op.create_index(op.f("ix_measurables_team_id"), "measurables", ["team_id"], unique=False)
    op.create_table(
        "meetings",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("team_id", sa.Text(), nullable=False),
        sa.Column("facilitator_id", sa.Text(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("section", sa.Text(), nullable=True),
        sa.Column("section_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "section IN ('scorecard', 'ids', 'conclude')", name=op.f("ck_meetings_section")
        ),
        sa.CheckConstraint(
            "(ended_at IS NULL AND section IS NOT NULL AND section_started_at IS NOT NULL) OR (ended_at IS NOT NULL AND section IS NULL AND section_started_at IS NULL)",
            name=op.f("ck_meetings_live_state"),
        ),
        sa.CheckConstraint(
            "ended_at IS NULL OR ended_at >= started_at", name=op.f("ck_meetings_ends_after_start")
        ),
        sa.ForeignKeyConstraint(
            ["facilitator_id"], ["users.id"], name=op.f("fk_meetings_facilitator_id_users")
        ),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], name=op.f("fk_meetings_team_id_teams")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_meetings")),
    )
    op.create_index(op.f("ix_meetings_team_id"), "meetings", ["team_id"], unique=False)
    op.create_index(
        "uq_meetings_active_team",
        "meetings",
        ["team_id"],
        unique=True,
        postgresql_where=sa.text("ended_at IS NULL"),
    )
    op.create_table(
        "memberships",
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("team_id", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(
            ["team_id"], ["teams.id"], name=op.f("fk_memberships_team_id_teams")
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_memberships_user_id_users")
        ),
        sa.PrimaryKeyConstraint("user_id", "team_id", name=op.f("pk_memberships")),
    )
    op.create_index(op.f("ix_memberships_team_id"), "memberships", ["team_id"], unique=False)
    op.create_table(
        "rocks",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("team_id", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("owner_id", sa.Text(), nullable=False),
        sa.Column("quarter", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.CheckConstraint("quarter ~ '^[0-9]{4}-Q[1-4]$'", name=op.f("ck_rocks_quarter_format")),
        sa.CheckConstraint(
            "status IN ('on_track', 'off_track', 'complete')", name=op.f("ck_rocks_status")
        ),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], name=op.f("fk_rocks_owner_id_users")),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], name=op.f("fk_rocks_team_id_teams")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_rocks")),
    )
    op.create_index(op.f("ix_rocks_team_id"), "rocks", ["team_id"], unique=False)
    op.create_table(
        "issues",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("team_id", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("owner_id", sa.Text(), nullable=False),
        sa.Column("priority", sa.SmallInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("solved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column("source_measurable_id", sa.Text(), nullable=True),
        sa.Column("source_week_start", sa.Date(), nullable=True),
        sa.CheckConstraint(
            "resolution_note IS NULL OR btrim(resolution_note) <> ''",
            name=op.f("ck_issues_resolution_note_not_blank"),
        ),
        sa.CheckConstraint(
            "title IS NULL OR btrim(title) <> ''", name=op.f("ck_issues_title_not_blank")
        ),
        sa.CheckConstraint(
            "(solved_at IS NULL) = (resolution_note IS NULL)",
            name=op.f("ck_issues_solved_with_note"),
        ),
        sa.CheckConstraint(
            "(source_measurable_id IS NULL) = (source_week_start IS NULL)",
            name=op.f("ck_issues_source_pair"),
        ),
        sa.CheckConstraint("priority BETWEEN 1 AND 5", name=op.f("ck_issues_priority_range")),
        sa.CheckConstraint(
            "source_week_start IS NULL OR EXTRACT(ISODOW FROM source_week_start) = 1",
            name=op.f("ck_issues_source_week_start_monday"),
        ),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], name=op.f("fk_issues_owner_id_users")),
        sa.ForeignKeyConstraint(
            ["source_measurable_id", "team_id"],
            ["measurables.id", "measurables.team_id"],
            name=op.f("fk_issues_source_measurable_id_measurables"),
        ),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], name=op.f("fk_issues_team_id_teams")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_issues")),
        sa.UniqueConstraint("id", "team_id", name=op.f("uq_issues_id")),
    )
    op.create_index(op.f("ix_issues_team_id"), "issues", ["team_id"], unique=False)
    op.create_index(
        "uq_issues_open_source",
        "issues",
        ["source_measurable_id", "source_week_start"],
        unique=True,
        postgresql_where=sa.text("solved_at IS NULL"),
    )
    op.create_table(
        "meeting_attendees",
        sa.Column("meeting_id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["meeting_id"], ["meetings.id"], name=op.f("fk_meeting_attendees_meeting_id_meetings")
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_meeting_attendees_user_id_users")
        ),
        sa.PrimaryKeyConstraint("meeting_id", "user_id", name=op.f("pk_meeting_attendees")),
    )
    op.create_table(
        "milestones",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("rock_id", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("done", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["rock_id"], ["rocks.id"], name=op.f("fk_milestones_rock_id_rocks")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_milestones")),
    )
    op.create_index(op.f("ix_milestones_rock_id"), "milestones", ["rock_id"], unique=False)
    op.create_table(
        "scores",
        sa.Column("measurable_id", sa.Text(), nullable=False),
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.Column("value", sa.Numeric(), nullable=False),
        sa.CheckConstraint(
            "week_start IS NULL OR EXTRACT(ISODOW FROM week_start) = 1",
            name=op.f("ck_scores_week_start_monday"),
        ),
        sa.ForeignKeyConstraint(
            ["measurable_id"], ["measurables.id"], name=op.f("fk_scores_measurable_id_measurables")
        ),
        sa.PrimaryKeyConstraint("measurable_id", "week_start", name=op.f("pk_scores")),
    )
    op.create_table(
        "meeting_ratings",
        sa.Column("meeting_id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("rating", sa.SmallInteger(), nullable=False),
        sa.CheckConstraint("rating BETWEEN 1 AND 10", name=op.f("ck_meeting_ratings_rating_range")),
        sa.ForeignKeyConstraint(
            ["meeting_id", "user_id"],
            ["meeting_attendees.meeting_id", "meeting_attendees.user_id"],
            name=op.f("fk_meeting_ratings_meeting_id_meeting_attendees"),
        ),
        sa.PrimaryKeyConstraint("meeting_id", "user_id", name=op.f("pk_meeting_ratings")),
    )
    op.create_table(
        "todos",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("team_id", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("owner_id", sa.Text(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("done_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_issue_id", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "title IS NULL OR btrim(title) <> ''", name=op.f("ck_todos_title_not_blank")
        ),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], name=op.f("fk_todos_owner_id_users")),
        sa.ForeignKeyConstraint(
            ["source_issue_id", "team_id"],
            ["issues.id", "issues.team_id"],
            name=op.f("fk_todos_source_issue_id_issues"),
        ),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], name=op.f("fk_todos_team_id_teams")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_todos")),
    )
    op.create_index(op.f("ix_todos_team_id"), "todos", ["team_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_todos_team_id"), table_name="todos")
    op.drop_table("todos")
    op.drop_table("meeting_ratings")
    op.drop_table("scores")
    op.drop_index(op.f("ix_milestones_rock_id"), table_name="milestones")
    op.drop_table("milestones")
    op.drop_table("meeting_attendees")
    op.drop_index(
        "uq_issues_open_source", table_name="issues", postgresql_where=sa.text("solved_at IS NULL")
    )
    op.drop_index(op.f("ix_issues_team_id"), table_name="issues")
    op.drop_table("issues")
    op.drop_index(op.f("ix_rocks_team_id"), table_name="rocks")
    op.drop_table("rocks")
    op.drop_index(op.f("ix_memberships_team_id"), table_name="memberships")
    op.drop_table("memberships")
    op.drop_index(
        "uq_meetings_active_team",
        table_name="meetings",
        postgresql_where=sa.text("ended_at IS NULL"),
    )
    op.drop_index(op.f("ix_meetings_team_id"), table_name="meetings")
    op.drop_table("meetings")
    op.drop_index(op.f("ix_measurables_team_id"), table_name="measurables")
    op.drop_table("measurables")
    op.drop_table("users")
    op.drop_table("teams")
    op.drop_table("companies")
