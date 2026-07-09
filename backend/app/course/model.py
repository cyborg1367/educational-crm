from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.department.model import Department
from app.organization.model import Organization


class CoursePrerequisite(Base):
    __tablename__ = "course_prerequisites"
    __table_args__ = (
        UniqueConstraint(
            "course_id", "prerequisite_course_id", name="uq_course_prerequisites_pair"
        ),
        CheckConstraint(
            "course_id <> prerequisite_course_id", name="ck_course_prerequisites_not_self"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id"), nullable=False
    )
    prerequisite_course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id"), nullable=False
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


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_price: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_sessions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    session_duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    sessions_per_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
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
    department: Mapped[Department] = relationship()
    prerequisite_links: Mapped[list["CoursePrerequisite"]] = relationship(
        "CoursePrerequisite",
        primaryjoin="Course.id == CoursePrerequisite.course_id",
        foreign_keys="[CoursePrerequisite.course_id]",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    prerequisites: Mapped[list["Course"]] = relationship(
        "Course",
        secondary=CoursePrerequisite.__table__,
        primaryjoin="Course.id == CoursePrerequisite.course_id",
        secondaryjoin="Course.id == CoursePrerequisite.prerequisite_course_id",
        viewonly=True,
        lazy="selectin",
    )
