"""enrollment_crud

Revision ID: h8c9d0e1f2a3
Revises: g7b8c9d0e1f2
Create Date: 2026-06-28 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "h8c9d0e1f2a3"
down_revision: Union[str, None] = "g7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "enrollments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("person_id", sa.Integer(), nullable=False),
        sa.Column("class_id", sa.Integer(), nullable=False),
        sa.Column("consultation_id", sa.Integer(), nullable=True),
        sa.Column("journey_id", sa.Integer(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "pre_enroll",
                "active",
                "completed",
                "dropped",
                name="enrollment_status",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("price_snapshot", sa.Integer(), nullable=False),
        sa.Column("discount_snapshot", sa.Integer(), nullable=False),
        sa.Column("final_amount", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
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
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"]),
        sa.ForeignKeyConstraint(["consultation_id"], ["consultations.id"]),
        sa.ForeignKeyConstraint(["journey_id"], ["journeys.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["person_id"], ["people.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_enrollments_org_id"), "enrollments", ["org_id"], unique=False)
    op.create_index(
        "uq_enrollments_person_class_live",
        "enrollments",
        ["person_id", "class_id"],
        unique=True,
        postgresql_where=sa.text("status != 'dropped'"),
    )


def downgrade() -> None:
    op.drop_index("uq_enrollments_person_class_live", table_name="enrollments")
    op.drop_index(op.f("ix_enrollments_org_id"), table_name="enrollments")
    op.drop_table("enrollments")
