from app.common.enums import MeetingSection

AGENDA: list[tuple[MeetingSection, str, int]] = [
    (MeetingSection.SCORECARD, "Scorecard", 5),
    (MeetingSection.IDS, "IDS", 60),
    (MeetingSection.CONCLUDE, "Conclude", 10),
]

SECTION_ORDER = [section for section, _, _ in AGENDA]


def next_section(section: MeetingSection) -> MeetingSection | None:
    position = SECTION_ORDER.index(section)
    return SECTION_ORDER[position + 1] if position + 1 < len(SECTION_ORDER) else None
