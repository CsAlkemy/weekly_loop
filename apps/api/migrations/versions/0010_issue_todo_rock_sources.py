"""an Issue can come from an overdue To-Do or an off-track Rock

Revision ID: 0010
Revises: 0009
"""

import sqlalchemy as sa
from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(op.f("uq_todos_id"), "todos", ["id", "team_id"])
    op.create_unique_constraint(op.f("uq_rocks_id"), "rocks", ["id", "team_id"])
    op.add_column("issues", sa.Column("source_todo_id", sa.Text(), nullable=True))
    op.add_column("issues", sa.Column("source_rock_id", sa.Text(), nullable=True))
    op.create_foreign_key(
        op.f("fk_issues_source_todo_id_todos"),
        "issues",
        "todos",
        ["source_todo_id", "team_id"],
        ["id", "team_id"],
    )
    op.create_foreign_key(
        op.f("fk_issues_source_rock_id_rocks"),
        "issues",
        "rocks",
        ["source_rock_id", "team_id"],
        ["id", "team_id"],
    )
    op.create_check_constraint(
        op.f("ck_issues_one_source"),
        "issues",
        "num_nonnulls(source_measurable_id, source_todo_id, source_rock_id) <= 1",
    )
    op.create_index(
        op.f("uq_issues_open_todo"),
        "issues",
        ["source_todo_id"],
        unique=True,
        postgresql_where=sa.text("solved_at IS NULL"),
    )
    op.create_index(
        op.f("uq_issues_open_rock"),
        "issues",
        ["source_rock_id"],
        unique=True,
        postgresql_where=sa.text("solved_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index(op.f("uq_issues_open_rock"), table_name="issues")
    op.drop_index(op.f("uq_issues_open_todo"), table_name="issues")
    op.drop_constraint(op.f("ck_issues_one_source"), "issues", type_="check")
    op.drop_constraint(op.f("fk_issues_source_rock_id_rocks"), "issues", type_="foreignkey")
    op.drop_constraint(op.f("fk_issues_source_todo_id_todos"), "issues", type_="foreignkey")
    op.drop_column("issues", "source_rock_id")
    op.drop_column("issues", "source_todo_id")
    op.drop_constraint(op.f("uq_rocks_id"), "rocks", type_="unique")
    op.drop_constraint(op.f("uq_todos_id"), "todos", type_="unique")
