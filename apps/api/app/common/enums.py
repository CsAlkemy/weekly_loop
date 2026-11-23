from enum import StrEnum


class Role(StrEnum):
    ADMIN = "admin"
    TEAM_MEMBER = "team_member"
    OBSERVER = "observer"


class GoalType(StrEnum):
    AT_LEAST = "at_least"
    AT_MOST = "at_most"
    BETWEEN = "between"
    EXACTLY = "exactly"


class RockStatus(StrEnum):
    ON_TRACK = "on_track"
    OFF_TRACK = "off_track"
    COMPLETE = "complete"


class MeetingSection(StrEnum):
    SCORECARD = "scorecard"
    IDS = "ids"
    CONCLUDE = "conclude"


class MeasurableStatus(StrEnum):
    ON_TRACK = "on_track"
    OFF_TRACK = "off_track"
    PENDING = "pending"
