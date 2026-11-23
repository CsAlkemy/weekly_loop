"""shared app clock, so every API process and restart agrees on the time

Revision ID: 0008
Revises: 0007
"""

import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "app_clock",
        sa.Column("id", sa.SmallInteger(), nullable=False),
        sa.Column("app_now", sa.DateTime(timezone=True), nullable=False),
        sa.Column("anchor", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("id = 1", name=op.f("ck_app_clock_single_row")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_app_clock")),
    )


def downgrade() -> None:
    op.drop_table("app_clock")
