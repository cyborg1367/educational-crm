from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.consultation.enums import ConsultationOutcome
from app.core.db import Base
from app.course.model import Course
from app.department.model import Department
from app.journey.model import Journey
from app.organization.model import Organization
from app.person.model import Person
from app.user.model import User


class Consultation(Base):
    __tablename__ = "consultations"

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id"), nullable=False)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), nullable=False)
    consultant_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    journey_id: Mapped[int | None] = mapped_column(ForeignKey("journeys.id"), nullable=True)
    current_level: Mapped[str | None] = mapped_column(Text, nullable=True)
    need: Mapped[str | None] = mapped_column(Text, nullable=True)
    goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    decision: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_course_id: Mapped[int | None] = mapped_column(
        ForeignKey("courses.id"), nullable=True
    )
    outcome: Mapped[ConsultationOutcome | None] = mapped_column(
        Enum(ConsultationOutcome, name="consultation_outcome", native_enum=False),
        nullable=True,
    )
    refer_to_department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id"), nullable=True
    )
    next_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_action_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    department: Mapped[Department] = relationship(foreign_keys=[department_id])
    consultant: Mapped[User] = relationship(foreign_keys=[consultant_id])
    journey: Mapped[Journey | None] = relationship()
    recommended_course: Mapped[Course | None] = relationship()
    refer_to_department: Mapped[Department | None] = relationship(
        foreign_keys=[refer_to_department_id]
    )
