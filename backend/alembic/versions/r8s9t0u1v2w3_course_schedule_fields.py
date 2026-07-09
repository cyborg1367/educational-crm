"""course_schedule_fields

Revision ID: r8s9t0u1v2w3
Revises: q7r8s9t0u1v2
Create Date: 2026-07-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "r8s9t0u1v2w3"
down_revision: Union[str, None] = "q7r8s9t0u1v2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("total_hours", sa.Integer(), nullable=True))
    op.add_column(
        "courses", sa.Column("session_duration", sa.Float(), nullable=True)
    )
    op.add_column(
        "courses", sa.Column("sessions_per_week", sa.Integer(), nullable=True)
    )
    op.add_column("classes", sa.Column("weekdays", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("classes", "weekdays")
    op.drop_column("courses", "sessions_per_week")
    op.drop_column("courses", "session_duration")
    op.drop_column("courses", "total_hours")
