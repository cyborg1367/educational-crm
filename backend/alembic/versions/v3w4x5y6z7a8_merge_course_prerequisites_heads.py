"""merge_course_prerequisites_heads

Two divergent branches each independently added a "course_prerequisites"
table:
  - s9t0u1v2w3x4 (-> u1v2w3x4y5z6): simple (course_id, prerequisite_id),
    no tenant scoping.
  - s0t1u2v3w4x5 (-> t1u2v3w4x5y6): richer (id, course_id,
    prerequisite_course_id, org_id, timestamps).

The application (app/course/model.py, app/attendance/progress.py,
scripts/seed_data.py) is written against the richer, org-scoped schema, so
that is the schema this merge keeps. If an environment happened to migrate
along the simple branch, its data is copied into the canonical shape below;
if it already migrated along the rich branch, this is a no-op.

Revision ID: v3w4x5y6z7a8
Revises: u1v2w3x4y5z6, t1u2v3w4x5y6
Create Date: 2026-07-09 09:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "v3w4x5y6z7a8"
down_revision: Union[str, Sequence[str], None] = ("u1v2w3x4y5z6", "t1u2v3w4x5y6")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {c["name"] for c in inspector.get_columns("course_prerequisites")}

    if "org_id" in columns:
        # Already on the canonical (rich) schema from s0t1u2v3w4x5.
        return

    # This environment took the older, simple branch. Migrate its data into
    # the canonical schema, deriving org_id from the owning course.
    op.create_table(
        "course_prerequisites_new",
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
    op.execute(
        sa.text(
            """
            INSERT INTO course_prerequisites_new
                (course_id, prerequisite_course_id, org_id)
            SELECT cp.course_id, cp.prerequisite_id, c.org_id
            FROM course_prerequisites cp
            JOIN courses c ON c.id = cp.course_id
            """
        )
    )
    op.drop_table("course_prerequisites")
    op.rename_table("course_prerequisites_new", "course_prerequisites")
    op.create_index(
        op.f("ix_course_prerequisites_org_id"),
        "course_prerequisites",
        ["org_id"],
        unique=False,
    )


def downgrade() -> None:
    # Merge revisions reconcile two branches into one canonical schema;
    # splitting back into the two divergent histories is not supported.
    raise NotImplementedError("merge_course_prerequisites_heads cannot be downgraded")
