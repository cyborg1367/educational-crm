"""journey_crud

Revision ID: a1b2c3d4e5f6
Revises: 98aa9341094e
Create Date: 2026-06-28 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "98aa9341094e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "journeys",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("person_id", sa.Integer(), nullable=False),
        sa.Column("department_id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=True),
        sa.Column("roadmap_id", sa.Integer(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "active",
                "on_hold",
                "completed",
                "dropped",
                name="journey_status",
                native_enum=False,
            ),
            nullable=False,
        ),
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
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["person_id"], ["people.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "org_id",
            "person_id",
            "department_id",
            name="uq_journeys_org_person_department",
        ),
    )
    op.create_index(op.f("ix_journeys_org_id"), "journeys", ["org_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_journeys_org_id"), table_name="journeys")
    op.drop_table("journeys")
