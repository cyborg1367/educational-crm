from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.course.model import Course
from app.journey.model import Journey
from app.organization.model import Organization
from app.roadmap.model import RoadmapItem
from app.user.model import User


class JourneyRoadmapWaiver(Base):
    __tablename__ = "journey_roadmap_waivers"
    __table_args__ = (
        UniqueConstraint(
            "journey_id",
            "roadmap_item_id",
            name="uq_journey_roadmap_waivers_journey_item",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    journey_id: Mapped[int] = mapped_column(ForeignKey("journeys.id"), nullable=False)
    roadmap_item_id: Mapped[int] = mapped_column(
        ForeignKey("roadmap_items.id"), nullable=False
    )
    course_id: Mapped[int | None] = mapped_column(
        ForeignKey("courses.id"), nullable=True
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    waived_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    org_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    organization: Mapped[Organization] = relationship()
    journey: Mapped[Journey] = relationship()
    roadmap_item: Mapped[RoadmapItem] = relationship()
    course: Mapped[Course | None] = relationship()
    waived_by_user: Mapped[User] = relationship(foreign_keys=[waived_by])
