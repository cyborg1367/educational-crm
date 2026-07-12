"""person_extra_phones

Revision ID: y1a2b3c4d5e6
Revises: x9y0z1a2b3c4
Create Date: 2026-07-12 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "y1a2b3c4d5e6"
down_revision: Union[str, None] = "x9y0z1a2b3c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("people", sa.Column("extra_phones", sa.JSON(), nullable=True))
    op.drop_column("people", "secondary_phone")


def downgrade() -> None:
    op.add_column(
        "people", sa.Column("secondary_phone", sa.String(length=50), nullable=True)
    )
    op.drop_column("people", "extra_phones")
