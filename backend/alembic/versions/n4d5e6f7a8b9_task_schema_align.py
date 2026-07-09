"""task_schema_align

Revision ID: n4d5e6f7a8b9
Revises: k1a2b3c4d5e6
Create Date: 2026-06-28 24:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "n4d5e6f7a8b9"
down_revision: Union[str, None] = "k1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(table: str) -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {column["name"] for column in inspector.get_columns(table)}


def upgrade() -> None:
    columns = _column_names("tasks")

    if "title" in columns:
        return

    op.add_column("tasks", sa.Column("title", sa.String(length=255), nullable=True))
    op.add_column("tasks", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("tasks", sa.Column("assignee_id", sa.Integer(), nullable=True))
    op.add_column("tasks", sa.Column("status", sa.String(length=32), nullable=True))
    op.add_column(
        "tasks", sa.Column("related_entity_type", sa.String(length=64), nullable=True)
    )
    op.add_column("tasks", sa.Column("related_entity_id", sa.Integer(), nullable=True))
    op.add_column(
        "tasks", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True)
    )

    if "notes" in columns:
        op.execute(
            "UPDATE tasks SET title = COALESCE(NULLIF(notes, ''), type, 'Task'), "
            "description = notes"
        )
    else:
        op.execute("UPDATE tasks SET title = COALESCE(type, 'Task')")

    if "assigned_to" in columns:
        op.execute("UPDATE tasks SET assignee_id = assigned_to")

    if "completed" in columns:
        op.execute(
            "UPDATE tasks SET status = CASE WHEN completed THEN 'done' ELSE 'open' END"
        )
    else:
        op.execute("UPDATE tasks SET status = 'open'")

    op.alter_column("tasks", "title", nullable=False)
    op.alter_column("tasks", "status", nullable=False)

    op.create_foreign_key(
        "fk_tasks_assignee_id_users",
        "tasks",
        "users",
        ["assignee_id"],
        ["id"],
    )

    op.alter_column(
        "tasks",
        "type",
        type_=sa.String(length=64),
        existing_type=sa.String(length=24),
        existing_nullable=False,
        postgresql_using="type::varchar(64)",
    )

    for legacy_column in ("assigned_to", "completed", "notes", "updated_at"):
        if legacy_column in columns:
            op.drop_column("tasks", legacy_column)


def downgrade() -> None:
    columns = _column_names("tasks")

    if "title" not in columns:
        return

    op.add_column("tasks", sa.Column("assigned_to", sa.Integer(), nullable=True))
    op.add_column(
        "tasks",
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("tasks", sa.Column("notes", sa.Text(), nullable=True))
    op.add_column(
        "tasks",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.execute(
        "UPDATE tasks SET assigned_to = assignee_id, "
        "completed = (status = 'done'), notes = description"
    )

    op.drop_constraint("fk_tasks_assignee_id_users", "tasks", type_="foreignkey")
    for column in (
        "completed_at",
        "related_entity_id",
        "related_entity_type",
        "status",
        "assignee_id",
        "description",
        "title",
    ):
        if column in columns:
            op.drop_column("tasks", column)

    op.alter_column(
        "tasks",
        "type",
        type_=sa.String(length=24),
        existing_type=sa.String(length=64),
        existing_nullable=False,
        postgresql_using="type::varchar(24)",
    )
