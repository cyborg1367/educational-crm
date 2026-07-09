"""course_prerequisites

This migration originally created a simple, non-tenant-scoped
"course_prerequisites" table on a branch that diverged from
s0t1u2v3w4x5 (which created a richer, org-scoped table of the same
name). The two were never reconciled and both landed on main, giving
alembic three heads and a table name collision if both branches were
ever replayed from scratch.

v3w4x5y6z7a8 (merge_course_prerequisites_heads) settles on the
org-scoped schema from s0t1u2v3w4x5 as canonical and, at runtime,
converts any existing simple-schema table it finds. To let a fresh
database replay cleanly through both branches without a duplicate
CREATE TABLE, this revision's upgrade/downgrade are now no-ops — table
ownership belongs entirely to s0t1u2v3w4x5. Environments that already
ran the original version of this migration are unaffected: alembic
does not re-run applied revisions, and the merge migration handles
converting their data.

Revision ID: s9t0u1v2w3x4
Revises: t0u1v2w3x4y5
Create Date: 2026-07-07 12:01:00.000000

"""
from typing import Sequence, Union


revision: str = "s9t0u1v2w3x4"
down_revision: Union[str, None] = "t0u1v2w3x4y5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
