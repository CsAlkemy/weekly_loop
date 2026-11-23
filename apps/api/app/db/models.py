from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Identity,
    Index,
    MetaData,
    Numeric,
    SmallInteger,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.common.enums import GoalType, MeetingSection, RockStatus, Role


def one_of(column: str, values: type[StrEnum]) -> str:
    allowed = ", ".join(f"'{value}'" for value in values)
    return f"{column} IN ({allowed})"


def is_monday(column: str) -> str:
    return f"{column} IS NULL OR EXTRACT(ISODOW FROM {column}) = 1"


def not_blank(column: str) -> str:
    return f"{column} IS NULL OR btrim({column}) <> ''"


class Base(DeclarativeBase):
    metadata = MetaData(
        naming_convention={
            "ix": "ix_%(table_name)s_%(column_0_name)s",
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )
    type_annotation_map = {str: Text, datetime: DateTime(timezone=True), Decimal: Numeric}


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str]
    timezone: Mapped[str]


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(primary_key=True)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"))
    name: Mapped[str]


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint(one_of("role", Role), name="role"),)

    id: Mapped[str] = mapped_column(primary_key=True)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"))
    name: Mapped[str]
    email: Mapped[str] = mapped_column(unique=True)
    role: Mapped[Role] = mapped_column(Text)
    password_hash: Mapped[str | None]
    test_forms_enabled: Mapped[bool] = mapped_column(default=False, server_default=text("false"))


class Membership(Base):
    __tablename__ = "memberships"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), primary_key=True, index=True)


class Measurable(Base):
    __tablename__ = "measurables"
    __table_args__ = (
        UniqueConstraint("id", "team_id"),
        CheckConstraint(one_of("goal_type", GoalType), name="goal_type"),
        CheckConstraint(
            "(goal_type = 'between' AND goal_value IS NULL"
            " AND goal_min IS NOT NULL AND goal_max IS NOT NULL AND goal_min <= goal_max)"
            " OR (goal_type <> 'between' AND goal_value IS NOT NULL"
            " AND goal_min IS NULL AND goal_max IS NULL)",
            name="goal_shape",
        ),
    )

    id: Mapped[str] = mapped_column(primary_key=True)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    name: Mapped[str]
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    unit: Mapped[str]
    goal_type: Mapped[GoalType] = mapped_column(Text)
    goal_value: Mapped[Decimal | None]
    goal_min: Mapped[Decimal | None]
    goal_max: Mapped[Decimal | None]
    tracked_from: Mapped[date | None]


class Score(Base):
    __tablename__ = "scores"
    __table_args__ = (CheckConstraint(is_monday("week_start"), name="week_start_monday"),)

    measurable_id: Mapped[str] = mapped_column(ForeignKey("measurables.id"), primary_key=True)
    week_start: Mapped[date] = mapped_column(primary_key=True)
    value: Mapped[Decimal]


class Rock(Base):
    __tablename__ = "rocks"
    __table_args__ = (
        UniqueConstraint("id", "team_id"),
        CheckConstraint(one_of("status", RockStatus), name="status"),
        CheckConstraint("quarter ~ '^[0-9]{4}-Q[1-4]$'", name="quarter_format"),
    )

    id: Mapped[str] = mapped_column(primary_key=True)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    title: Mapped[str]
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    quarter: Mapped[str]
    status: Mapped[RockStatus] = mapped_column(Text)


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[str] = mapped_column(primary_key=True)
    rock_id: Mapped[str] = mapped_column(ForeignKey("rocks.id"), index=True)
    title: Mapped[str]
    due_date: Mapped[date]
    done: Mapped[bool]


class Issue(Base):
    __tablename__ = "issues"
    __table_args__ = (
        UniqueConstraint("id", "team_id"),
        ForeignKeyConstraint(
            ["source_measurable_id", "team_id"],
            ["measurables.id", "measurables.team_id"],
        ),
        CheckConstraint(not_blank("title"), name="title_not_blank"),
        CheckConstraint("priority BETWEEN 1 AND 5", name="priority_range"),
        CheckConstraint("(solved_at IS NULL) = (resolution_note IS NULL)", name="solved_with_note"),
        CheckConstraint(not_blank("resolution_note"), name="resolution_note_not_blank"),
        CheckConstraint(
            "solved_by_id IS NULL OR solved_at IS NOT NULL", name="solved_by_needs_solved_at"
        ),
        CheckConstraint(
            "(source_measurable_id IS NULL) = (source_week_start IS NULL)", name="source_pair"
        ),
        CheckConstraint(is_monday("source_week_start"), name="source_week_start_monday"),
        ForeignKeyConstraint(
            ["source_todo_id", "team_id"], ["todos.id", "todos.team_id"], use_alter=True
        ),
        ForeignKeyConstraint(["source_rock_id", "team_id"], ["rocks.id", "rocks.team_id"]),
        CheckConstraint(
            "num_nonnulls(source_measurable_id, source_todo_id, source_rock_id) <= 1",
            name="one_source",
        ),
        Index(
            "uq_issues_open_source",
            "source_measurable_id",
            "source_week_start",
            unique=True,
            postgresql_where=text("solved_at IS NULL"),
        ),
        Index(
            "uq_issues_open_todo",
            "source_todo_id",
            unique=True,
            postgresql_where=text("solved_at IS NULL"),
        ),
        Index(
            "uq_issues_open_rock",
            "source_rock_id",
            unique=True,
            postgresql_where=text("solved_at IS NULL"),
        ),
    )

    id: Mapped[str] = mapped_column(primary_key=True)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    title: Mapped[str]
    details: Mapped[str | None]
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    priority: Mapped[int | None] = mapped_column(SmallInteger)
    created_at: Mapped[datetime]
    solved_at: Mapped[datetime | None]
    solved_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    resolution_note: Mapped[str | None]
    source_measurable_id: Mapped[str | None]
    source_week_start: Mapped[date | None]
    source_todo_id: Mapped[str | None]
    source_rock_id: Mapped[str | None]


class Todo(Base):
    __tablename__ = "todos"
    __table_args__ = (
        UniqueConstraint("id", "team_id"),
        ForeignKeyConstraint(["source_issue_id", "team_id"], ["issues.id", "issues.team_id"]),
        CheckConstraint(not_blank("title"), name="title_not_blank"),
        CheckConstraint("done_by_id IS NULL OR done_at IS NOT NULL", name="done_by_needs_done_at"),
    )

    id: Mapped[str] = mapped_column(primary_key=True)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    title: Mapped[str]
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    due_date: Mapped[date]
    done_at: Mapped[datetime | None]
    done_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    source_issue_id: Mapped[str | None]
    created_at: Mapped[datetime]


class Meeting(Base):
    __tablename__ = "meetings"
    __table_args__ = (
        CheckConstraint(one_of("section", MeetingSection), name="section"),
        CheckConstraint("ended_at IS NULL OR ended_at >= started_at", name="ends_after_start"),
        CheckConstraint(
            "(ended_at IS NULL AND section IS NOT NULL AND section_started_at IS NOT NULL)"
            " OR (ended_at IS NOT NULL AND section IS NULL AND section_started_at IS NULL)",
            name="live_state",
        ),
        Index(
            "uq_meetings_active_team",
            "team_id",
            unique=True,
            postgresql_where=text("ended_at IS NULL"),
        ),
    )

    id: Mapped[str] = mapped_column(primary_key=True)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    facilitator_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    started_at: Mapped[datetime]
    ended_at: Mapped[datetime | None]
    section: Mapped[MeetingSection | None] = mapped_column(Text)
    section_started_at: Mapped[datetime | None]


class MeetingAttendee(Base):
    __tablename__ = "meeting_attendees"

    meeting_id: Mapped[str] = mapped_column(ForeignKey("meetings.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    joined_at: Mapped[datetime]


class MeetingRating(Base):
    __tablename__ = "meeting_ratings"
    __table_args__ = (
        ForeignKeyConstraint(
            ["meeting_id", "user_id"],
            ["meeting_attendees.meeting_id", "meeting_attendees.user_id"],
        ),
        CheckConstraint("rating BETWEEN 1 AND 10", name="rating_range"),
    )

    meeting_id: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(primary_key=True)
    rating: Mapped[int] = mapped_column(SmallInteger)


class LoginFailure(Base):
    __tablename__ = "login_failures"
    __table_args__ = (Index("ix_login_failures_email", "email", "failed_at"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    email: Mapped[str]
    failed_at: Mapped[datetime]


class AppClock(Base):
    __tablename__ = "app_clock"
    __table_args__ = (CheckConstraint("id = 1", name="single_row"),)

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    app_now: Mapped[datetime]
    anchor: Mapped[datetime]


class MeetingSummaryRecord(Base):
    __tablename__ = "meeting_summaries"

    meeting_id: Mapped[str] = mapped_column(ForeignKey("meetings.id"), primary_key=True)
    data: Mapped[dict] = mapped_column(JSONB)
    frozen_at: Mapped[datetime]


class Activity(Base):
    __tablename__ = "activity"
    __table_args__ = (Index("ix_activity_team_id", "team_id", "at"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"))
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str]
    summary: Mapped[str]
    at: Mapped[datetime]
