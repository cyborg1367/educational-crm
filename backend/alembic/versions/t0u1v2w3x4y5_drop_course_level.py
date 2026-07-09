"""drop_course_level

Revision ID: t0u1v2w3x4y5
Revises: r8s9t0u1v2w3
Create Date: 2026-07-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "t0u1v2w3x4y5"
down_revision: Union[str, None] = "r8s9t0u1v2w3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("courses", "level")


def downgrade() -> None:
    op.add_column(
        "courses",
        sa.Column("level", sa.String(length=100), nullable=True),
    )
