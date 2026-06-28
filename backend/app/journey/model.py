from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.department.model import Department
from app.journey.enums import JourneyStatus
from app.organization.model import Organization
from app.person.model import Person
from app.user.model import User


class Journey(Base):
    __tablename__ = "journeys"
    __table_args__ = (
        UniqueConstraint("org_id", "person_id", "department_id", name="uq_journeys_org_person_department"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id"), nullable=False)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), nullable=False)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    roadmap_id: Mapped[int | None] = mapped_column(
        ForeignKey("roadmaps.id"), nullable=True
    )
    status: Mapped[JourneyStatus] = mapped_column(
        Enum(JourneyStatus, name="journey_status", native_enum=False),
        nullable=False,
        default=JourneyStatus.active,
    )
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
    person: Mapped[Person] = relationship()
    department: Mapped[Department] = relationship()
    owner: Mapped[User | None] = relationship(foreign_keys=[owner_id])
