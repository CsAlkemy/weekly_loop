"""activity log: who changed what, and when

Revision ID: 0011
Revises: 0010
"""

import sqlalchemy as sa
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "activity",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("team_id", sa.Text(), nullable=False),
        sa.Column("actor_id", sa.Text(), nullable=False),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], name=op.f("fk_activity_team_id_teams")),
        sa.ForeignKeyConstraint(
            ["actor_id"], ["users.id"], name=op.f("fk_activity_actor_id_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_activity")),
    )
    op.create_index(op.f("ix_activity_team_id"), "activity", ["team_id", "at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_activity_team_id"), table_name="activity")
    op.drop_table("activity")
