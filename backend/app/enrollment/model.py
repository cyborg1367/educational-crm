from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Index, Integer, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.consultation.model import Consultation
from app.core.db import Base
from app.course_class.model import CourseClass
from app.enrollment.enums import EnrollmentStatus
from app.journey.model import Journey
from app.organization.model import Organization
from app.person.model import Person


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        Index(
            "uq_enrollments_person_class_live",
            "person_id",
            "class_id",
            unique=True,
            postgresql_where=text("status != 'dropped'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id"), nullable=False)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id"), nullable=False)
    consultation_id: Mapped[int | None] = mapped_column(
        ForeignKey("consultations.id"), nullable=True
    )
    journey_id: Mapped[int | None] = mapped_column(
        ForeignKey("journeys.id"), nullable=True
    )
    status: Mapped[EnrollmentStatus] = mapped_column(
        Enum(EnrollmentStatus, name="enrollment_status", native_enum=False),
        nullable=False,
        default=EnrollmentStatus.pre_enroll,
    )
    price_snapshot: Mapped[int] = mapped_column(Integer, nullable=False)
    discount_snapshot: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    final_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
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
    course_class: Mapped[CourseClass] = relationship()
    consultation: Mapped[Consultation | None] = relationship()
    journey: Mapped[Journey | None] = relationship()
