"""consultation_crud

Revision ID: g7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-06-28 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "g7b8c9d0e1f2"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "consultations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("person_id", sa.Integer(), nullable=False),
        sa.Column("department_id", sa.Integer(), nullable=False),
        sa.Column("consultant_id", sa.Integer(), nullable=False),
        sa.Column("journey_id", sa.Integer(), nullable=True),
        sa.Column("current_level", sa.Text(), nullable=True),
        sa.Column("need", sa.Text(), nullable=True),
        sa.Column("goal", sa.Text(), nullable=True),
        sa.Column("decision", sa.Text(), nullable=True),
        sa.Column("recommended_course_id", sa.Integer(), nullable=True),
        sa.Column(
            "outcome",
            sa.Enum(
                "pre_enroll",
                "follow_up",
                "refer_other_dept",
                "not_suitable",
                "closed",
                "continue",
                name="consultation_outcome",
                native_enum=False,
            ),
            nullable=True,
        ),
        sa.Column("refer_to_department_id", sa.Integer(), nullable=True),
        sa.Column("next_action", sa.Text(), nullable=True),
        sa.Column("next_action_date", sa.Date(), nullable=True),
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
        sa.ForeignKeyConstraint(["consultant_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"]),
        sa.ForeignKeyConstraint(["journey_id"], ["journeys.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["person_id"], ["people.id"]),
        sa.ForeignKeyConstraint(["recommended_course_id"], ["courses.id"]),
        sa.ForeignKeyConstraint(["refer_to_department_id"], ["departments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_consultations_org_id"), "consultations", ["org_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_consultations_org_id"), table_name="consultations")
    op.drop_table("consultations")
