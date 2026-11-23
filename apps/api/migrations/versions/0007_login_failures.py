"""failed sign-ins, for the login rate limit

Revision ID: 0007
Revises: 0006
"""

import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "login_failures",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_login_failures")),
    )
    op.create_index(
        op.f("ix_login_failures_email"), "login_failures", ["email", "failed_at"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_login_failures_email"), table_name="login_failures")
    op.drop_table("login_failures")
