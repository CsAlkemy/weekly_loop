"""who marked a To-Do done and who solved an Issue

Revision ID: 0006
Revises: 0005
"""

import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("todos", sa.Column("done_by_id", sa.Text(), nullable=True))
    op.create_foreign_key(
        op.f("fk_todos_done_by_id_users"), "todos", "users", ["done_by_id"], ["id"]
    )
    op.create_check_constraint(
        op.f("ck_todos_done_by_needs_done_at"), "todos", "done_by_id IS NULL OR done_at IS NOT NULL"
    )
    op.add_column("issues", sa.Column("solved_by_id", sa.Text(), nullable=True))
    op.create_foreign_key(
        op.f("fk_issues_solved_by_id_users"), "issues", "users", ["solved_by_id"], ["id"]
    )
    op.create_check_constraint(
        op.f("ck_issues_solved_by_needs_solved_at"),
        "issues",
        "solved_by_id IS NULL OR solved_at IS NOT NULL",
    )


def downgrade() -> None:
    op.drop_constraint(op.f("ck_issues_solved_by_needs_solved_at"), "issues", type_="check")
    op.drop_constraint(op.f("fk_issues_solved_by_id_users"), "issues", type_="foreignkey")
    op.drop_column("issues", "solved_by_id")
    op.drop_constraint(op.f("ck_todos_done_by_needs_done_at"), "todos", type_="check")
    op.drop_constraint(op.f("fk_todos_done_by_id_users"), "todos", type_="foreignkey")
    op.drop_column("todos", "done_by_id")
