"""payment_crud

Revision ID: o5e6f7a8b9c0
Revises: n4d5e6f7a8b9
Create Date: 2026-06-29 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "o5e6f7a8b9c0"
down_revision: Union[str, None] = "n4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("installment_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("recorded_by", sa.Integer(), nullable=False),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.String(), nullable=True),
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
        sa.ForeignKeyConstraint(["installment_id"], ["installments.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["recorded_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_payments_org_id"), "payments", ["org_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_payments_org_id"), table_name="payments")
    op.drop_table("payments")
