"""journey_roadmap_fk

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-28 20:01:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_foreign_key(
        "fk_journeys_roadmap_id_roadmaps",
        "journeys",
        "roadmaps",
        ["roadmap_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_journeys_roadmap_id_roadmaps", "journeys", type_="foreignkey"
    )
