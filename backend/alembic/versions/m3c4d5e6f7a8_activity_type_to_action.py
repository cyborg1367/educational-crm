"""activity_schema_align

Revision ID: m3c4d5e6f7a8
Revises: l2b3c4d5e6f7
Create Date: 2026-06-28 23:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "m3c4d5e6f7a8"
down_revision: Union[str, None] = "l2b3c4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(table: str) -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {column["name"] for column in inspector.get_columns(table)}


def upgrade() -> None:
    columns = _column_names("activities")

    if "type" in columns and "action" not in columns:
        op.alter_column(
            "activities",
            "type",
            new_column_name="action",
            type_=sa.Text(),
            existing_type=sa.String(length=64),
            existing_nullable=False,
        )
        columns.remove("type")
        columns.add("action")
    elif "action" in columns:
        op.alter_column(
            "activities",
            "action",
            type_=sa.Text(),
            existing_type=sa.String(),
            existing_nullable=False,
            postgresql_using="action::text",
        )

    if "payload" not in columns:
        op.add_column(
            "activities",
            sa.Column(
                "payload",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=True,
            ),
        )

    if "actor_id" not in columns:
        op.add_column(
            "activities",
            sa.Column("actor_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_activities_actor_id_users",
            "activities",
            "users",
            ["actor_id"],
            ["id"],
        )

    for legacy_column in ("channel", "summary", "metadata"):
        if legacy_column in columns:
            op.drop_column("activities", legacy_column)


def downgrade() -> None:
    columns = _column_names("activities")

    for legacy_column in ("channel", "summary", "metadata"):
        if legacy_column not in columns:
            if legacy_column == "channel":
                op.add_column(
                    "activities",
                    sa.Column("channel", sa.String(length=64), nullable=True),
                )
            elif legacy_column == "summary":
                op.add_column(
                    "activities",
                    sa.Column("summary", sa.Text(), nullable=True),
                )
            else:
                op.add_column(
                    "activities",
                    sa.Column(
                        "metadata",
                        postgresql.JSONB(astext_type=sa.Text()),
                        nullable=True,
                    ),
                )

    if "actor_id" in columns:
        op.drop_constraint(
            "fk_activities_actor_id_users", "activities", type_="foreignkey"
        )
        op.drop_column("activities", "actor_id")

    if "payload" in columns:
        op.drop_column("activities", "payload")

    if "action" in columns:
        op.alter_column(
            "activities",
            "action",
            new_column_name="type",
            type_=sa.String(length=64),
            existing_type=sa.Text(),
            existing_nullable=False,
            postgresql_using="action::varchar",
        )
