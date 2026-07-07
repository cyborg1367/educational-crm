"""one roadmap per department

Revision ID: u1v2w3x4y5z6
Revises: t0u1v2w3x4y5
Create Date: 2026-07-07

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "u1v2w3x4y5z6"
down_revision: str | None = "s9t0u1v2w3x4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    connection = op.get_bind()

    duplicate_groups = connection.execute(
        sa.text(
            """
            SELECT org_id, department_id, array_agg(id ORDER BY id) AS roadmap_ids
            FROM roadmaps
            GROUP BY org_id, department_id
            HAVING count(*) > 1
            """
        )
    ).fetchall()

    for org_id, department_id, roadmap_ids in duplicate_groups:
        keep_id = roadmap_ids[0]
        duplicate_ids = roadmap_ids[1:]
        for duplicate_id in duplicate_ids:
            connection.execute(
                sa.text(
                    """
                    UPDATE journeys
                    SET roadmap_id = :keep_id
                    WHERE org_id = :org_id AND roadmap_id = :duplicate_id
                    """
                ),
                {
                    "keep_id": keep_id,
                    "org_id": org_id,
                    "duplicate_id": duplicate_id,
                },
            )
            connection.execute(
                sa.text(
                    """
                    DELETE FROM roadmap_items
                    WHERE org_id = :org_id AND roadmap_id = :duplicate_id
                    """
                ),
                {"org_id": org_id, "duplicate_id": duplicate_id},
            )
            connection.execute(
                sa.text(
                    """
                    DELETE FROM roadmaps
                    WHERE org_id = :org_id AND id = :duplicate_id
                    """
                ),
                {"org_id": org_id, "duplicate_id": duplicate_id},
            )

    op.create_index(
        "uq_roadmaps_org_department",
        "roadmaps",
        ["org_id", "department_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_roadmaps_org_department", table_name="roadmaps")
