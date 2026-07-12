"""person_secondary_phone

Revision ID: x9y0z1a2b3c4
Revises: w4x5y6z7a8b9
Create Date: 2026-07-12 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "x9y0z1a2b3c4"
down_revision: Union[str, None] = "w4x5y6z7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "people", sa.Column("secondary_phone", sa.String(length=50), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("people", "secondary_phone")
