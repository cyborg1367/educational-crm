from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.core.pagination import paginate_query
from app.course.model import Course
from app.course.schemas import CourseCreate, CourseUpdate
from app.department import service as department_service
from app.tenancy.scoping import scoped


def list_courses(
    db: Session,
    org_id: int,
    *,
    is_active: bool | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Course], int]:
    stmt = scoped(select(Course), Course, org_id).order_by(Course.title)
    if is_active is not None:
        stmt = stmt.where(Course.is_active == is_active)
    return paginate_query(db, stmt, limit=limit, offset=offset)


def get_course(db: Session, org_id: int, course_id: int) -> Course:
    stmt = scoped(select(Course), Course, org_id).where(Course.id == course_id)
    course = db.scalars(stmt).first()
    if course is None:
        raise NotFoundError("Course not found")
    return course


def _validate_department(db: Session, org_id: int, department_id: int) -> None:
    department_service.get_department(db, org_id, department_id)


def create_course(db: Session, org_id: int, data: CourseCreate) -> Course:
    _validate_department(db, org_id, data.department_id)

    course = Course(
        department_id=data.department_id,
        title=data.title,
        description=data.description,
        level=data.level,
        current_price=data.current_price,
        duration_sessions=data.duration_sessions,
        is_active=data.is_active,
        org_id=org_id,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def update_course(
    db: Session, org_id: int, course_id: int, data: CourseUpdate
) -> Course:
    course = get_course(db, org_id, course_id)
    updates = data.model_dump(exclude_unset=True)

    if "department_id" in updates:
        _validate_department(db, org_id, updates["department_id"])

    for field, value in updates.items():
        setattr(course, field, value)

    db.commit()
    db.refresh(course)
    return course
