"""person_extended_fields

Revision ID: q7r8s9t0u1v2
Revises: p6f7a8b9c0d1
Create Date: 2026-07-04 13:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "q7r8s9t0u1v2"
down_revision: Union[str, None] = "p6f7a8b9c0d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("people", sa.Column("birth_date", sa.Date(), nullable=True))
    op.add_column("people", sa.Column("gender", sa.String(length=10), nullable=True))
    op.add_column("people", sa.Column("address", sa.Text(), nullable=True))
    op.add_column("people", sa.Column("interests", sa.JSON(), nullable=True))
    op.add_column("people", sa.Column("interests_note", sa.Text(), nullable=True))
    op.alter_column(
        "people",
        "source",
        existing_type=sa.String(length=255),
        type_=sa.String(length=50),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "people",
        "source",
        existing_type=sa.String(length=50),
        type_=sa.String(length=255),
        existing_nullable=True,
    )
    op.drop_column("people", "interests_note")
    op.drop_column("people", "interests")
    op.drop_column("people", "address")
    op.drop_column("people", "gender")
    op.drop_column("people", "birth_date")
