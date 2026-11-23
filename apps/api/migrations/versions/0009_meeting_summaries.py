"""frozen meeting summaries

Revision ID: 0009
Revises: 0008
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "meeting_summaries",
        sa.Column("meeting_id", sa.Text(), nullable=False),
        sa.Column("data", postgresql.JSONB(), nullable=False),
        sa.Column("frozen_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["meeting_id"], ["meetings.id"], name=op.f("fk_meeting_summaries_meeting_id_meetings")
        ),
        sa.PrimaryKeyConstraint("meeting_id", name=op.f("pk_meeting_summaries")),
    )


def downgrade() -> None:
    op.drop_table("meeting_summaries")
