"""course_prerequisites

Revision ID: s0t1u2v3w4x5
Revises: r8s9t0u1v2w3
Create Date: 2026-07-08 12:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "s0t1u2v3w4x5"
down_revision: Union[str, None] = "r8s9t0u1v2w3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "course_prerequisites" in inspector.get_table_names():
        # Table already exists (e.g. created by the older simple branch
        # s9t0u1v2w3x4). v3w4x5y6z7a8 (merge_course_prerequisites_heads)
        # converts it to this rich, org-scoped schema, so skip the CREATE
        # here to avoid a DuplicateTable error.
        return

    op.create_table(
        "course_prerequisites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("prerequisite_course_id", sa.Integer(), nullable=False),
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
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"]),
        sa.ForeignKeyConstraint(["prerequisite_course_id"], ["courses.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "course_id",
            "prerequisite_course_id",
            name="uq_course_prerequisites_pair",
        ),
        sa.CheckConstraint(
            "course_id <> prerequisite_course_id",
            name="ck_course_prerequisites_not_self",
        ),
    )
    op.create_index(
        op.f("ix_course_prerequisites_org_id"),
        "course_prerequisites",
        ["org_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_course_prerequisites_org_id"), table_name="course_prerequisites")
    op.drop_table("course_prerequisites")
