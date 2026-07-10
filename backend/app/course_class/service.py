from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ValidationError
from app.core.pagination import paginate_query
from app.course import service as course_service
from app.course.model import Course
from app.course_class.enums import ClassStatus
from app.course_class.model import CourseClass
from app.course_class.schemas import CourseClassCreate, CourseClassUpdate
from app.tenancy.scoping import scoped
from app.user import service as user_service
from app.user.enums import UserRole
from app.user.model import User


def list_classes(
    db: Session,
    org_id: int,
    *,
    status: ClassStatus | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[CourseClass], int]:
    stmt = scoped(select(CourseClass), CourseClass, org_id).order_by(
        CourseClass.start_date.desc(), CourseClass.name
    )
    if status is not None:
        stmt = stmt.where(CourseClass.status == status)
    return paginate_query(db, stmt, limit=limit, offset=offset)


def get_class(db: Session, org_id: int, class_id: int) -> CourseClass:
    stmt = scoped(select(CourseClass), CourseClass, org_id).where(
        CourseClass.id == class_id
    )
    course_class = db.scalars(stmt).first()
    if course_class is None:
        raise NotFoundError("Class not found")
    return course_class


def _validate_course(
    db: Session, org_id: int, course_id: int, *, actor: User | None = None
) -> Course:
    course = course_service.get_course(db, org_id, course_id)
    if actor is not None and actor.role == UserRole.department_manager:
        if (
            actor.department_id is None
            or course.department_id != actor.department_id
        ):
            raise ValidationError(
                "department managers may only create classes for their department courses",
                field="course_id",
            )
    return course


def _validate_teacher(db: Session, org_id: int, teacher_id: int) -> None:
    teacher = user_service.get_user(db, org_id, teacher_id)
    if teacher.role != UserRole.teacher:
        raise ValidationError(
            "teacher_id must reference a user with role teacher",
            field="teacher_id",
        )


def create_class(
    db: Session, org_id: int, data: CourseClassCreate, *, actor: User | None = None
) -> CourseClass:
    _validate_course(db, org_id, data.course_id, actor=actor)
    _validate_teacher(db, org_id, data.teacher_id)

    course_class = CourseClass(
        course_id=data.course_id,
        teacher_id=data.teacher_id,
        name=data.name,
        start_date=data.start_date,
        end_date=data.end_date,
        weekdays=data.weekdays,
        status=data.status,
        org_id=org_id,
    )
    db.add(course_class)
    db.commit()
    db.refresh(course_class)
    return course_class


def update_class(
    db: Session,
    org_id: int,
    class_id: int,
    data: CourseClassUpdate,
    *,
    actor: User | None = None,
) -> CourseClass:
    course_class = get_class(db, org_id, class_id)
    updates = data.model_dump(exclude_unset=True)

    if "course_id" in updates:
        _validate_course(db, org_id, updates["course_id"], actor=actor)
    if "teacher_id" in updates:
        _validate_teacher(db, org_id, updates["teacher_id"])

    for field, value in updates.items():
        setattr(course_class, field, value)

    db.commit()
    db.refresh(course_class)
    return course_class


def delete_class(db: Session, org_id: int, class_id: int) -> None:
    from sqlalchemy import func

    from app.enrollment.model import Enrollment

    course_class = get_class(db, org_id, class_id)

    active_enrollments = db.scalar(
        select(func.count(Enrollment.id)).where(
            Enrollment.class_id == class_id,
            Enrollment.status.in_(["enrolled", "active"]),
        )
    )
    if active_enrollments and active_enrollments > 0:
        raise ValidationError(
            "Cannot delete class with active enrollments. Please drop all active enrollments first.",
            field="class_id",
        )

    db.delete(course_class)
    db.commit()
