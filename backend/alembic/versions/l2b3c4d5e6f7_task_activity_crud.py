"""task_activity_crud

Revision ID: l2b3c4d5e6f7
Revises: k1a2b3c4d5e6
Create Date: 2026-06-28 25:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "l2b3c4d5e6f7"
down_revision: Union[str, None] = "k1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "follow_up_registration",
                "pre_enroll_unpaid",
                "post_course_consultation",
                "dormant_followup",
                "installment_overdue",
                "referral",
                "custom",
                name="task_type",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("person_id", sa.Integer(), nullable=False),
        sa.Column("assigned_to", sa.Integer(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["assigned_to"], ["users.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["person_id"], ["people.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tasks_org_id"), "tasks", ["org_id"], unique=False)

    op.create_table(
        "activities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("person_id", sa.Integer(), nullable=False),
        sa.Column(
            "channel",
            sa.Enum(
                "consultation",
                "enrollment",
                "payment",
                "task",
                "status_change",
                "communication",
                "custom",
                name="activity_channel",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["person_id"], ["people.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_activities_org_id"), "activities", ["org_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_activities_org_id"), table_name="activities")
    op.drop_table("activities")
    op.drop_index(op.f("ix_tasks_org_id"), table_name="tasks")
    op.drop_table("tasks")
