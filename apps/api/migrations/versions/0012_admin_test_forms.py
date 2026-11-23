"""test forms are a personal setting on each Admin

Revision ID: 0012
Revises: 0011
"""

import sqlalchemy as sa
from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("test_forms_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.drop_column("companies", "test_forms_enabled")


def downgrade() -> None:
    op.add_column(
        "companies",
        sa.Column("test_forms_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.drop_column("users", "test_forms_enabled")
