import math

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ValidationError
from app.core.pagination import paginate_query
from app.course.model import Course, CoursePrerequisite
from app.course.schemas import CourseCreate, CourseUpdate
from app.department import service as department_service
from app.roadmap import service as roadmap_service
from app.tenancy.scoping import scoped


def _apply_duration_sessions(
    course: Course,
    total_hours: int | None,
    session_duration: float | None,
) -> None:
    if total_hours and session_duration:
        course.duration_sessions = math.ceil(total_hours / session_duration)


def list_courses(
    db: Session,
    org_id: int,
    *,
    department_id: int | None = None,
    is_active: bool | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Course], int]:
    stmt = scoped(select(Course), Course, org_id).order_by(Course.title)
    if department_id is not None:
        stmt = stmt.where(Course.department_id == department_id)
    if is_active is not None:
        stmt = stmt.where(Course.is_active == is_active)
    return paginate_query(db, stmt, limit=limit, offset=offset)


def get_course(db: Session, org_id: int, course_id: int) -> Course:
    stmt = scoped(select(Course), Course, org_id).where(Course.id == course_id)
    course = db.scalars(stmt).first()
    if course is None:
        raise NotFoundError("Course not found")
    return course


def get_department_roadmap(
    db: Session, org_id: int, department_id: int
) -> list[Course]:
    department_service.get_department(db, org_id, department_id)
    stmt = (
        scoped(select(Course), Course, org_id)
        .where(
            Course.department_id == department_id,
            Course.is_active.is_(True),
        )
        .order_by(Course.title)
    )
    return list(db.scalars(stmt).all())


def _validate_department(db: Session, org_id: int, department_id: int) -> None:
    department_service.get_department(db, org_id, department_id)


def _set_prerequisites(
    db: Session,
    org_id: int,
    course: Course,
    prerequisite_ids: list[int],
) -> None:
    if course.id is not None and course.id in prerequisite_ids:
        raise ValidationError(
            "A course cannot be its own prerequisite",
            field="prerequisite_ids",
        )

    if not prerequisite_ids:
        course.prerequisite_links = []
        db.flush()
        return

    stmt = scoped(select(Course), Course, org_id).where(
        Course.id.in_(prerequisite_ids),
        Course.department_id == course.department_id,
    )
    prereqs = list(db.scalars(stmt).all())
    found_ids = {prereq.id for prereq in prereqs}
    missing = set(prerequisite_ids) - found_ids
    if missing:
        raise ValidationError(
            "Prerequisites must belong to the same department",
            field="prerequisite_ids",
        )
    course.prerequisite_links = [
        CoursePrerequisite(prerequisite_course_id=prereq.id, org_id=org_id)
        for prereq in prereqs
    ]
    db.flush()


def create_course(db: Session, org_id: int, data: CourseCreate) -> Course:
    _validate_department(db, org_id, data.department_id)

    payload = data.model_dump(exclude={"prerequisite_ids", "prerequisite_course_ids"})
    course = Course(
        **payload,
        org_id=org_id,
    )
    _apply_duration_sessions(course, course.total_hours, course.session_duration)
    db.add(course)
    db.flush()

    _set_prerequisites(db, org_id, course, _prerequisite_ids(data))
    roadmap_service.sync_department_roadmap(db, org_id, data.department_id)
    db.commit()
    db.refresh(course)
    return course


def _prerequisite_ids(data: CourseCreate | CourseUpdate) -> list[int]:
    """Resolve the requested prerequisite course ids.

    The frontend submits ``prerequisite_course_ids``; older clients may use
    ``prerequisite_ids``. Prefer whichever is provided.
    """
    course_ids = getattr(data, "prerequisite_course_ids", None)
    if course_ids:
        return course_ids
    legacy_ids = getattr(data, "prerequisite_ids", None)
    return legacy_ids or []


def update_course(
    db: Session, org_id: int, course_id: int, data: CourseUpdate
) -> Course:
    course = get_course(db, org_id, course_id)
    old_department_id = course.department_id
    updates = data.model_dump(exclude_unset=True)
    prerequisite_course_ids = updates.pop("prerequisite_course_ids", None)
    prerequisite_ids = updates.pop("prerequisite_ids", None)
    resolved_prerequisite_ids: list[int] | None = None
    if prerequisite_course_ids is not None:
        resolved_prerequisite_ids = prerequisite_course_ids
    elif prerequisite_ids is not None:
        resolved_prerequisite_ids = prerequisite_ids

    if "department_id" in updates:
        _validate_department(db, org_id, updates["department_id"])

    for field, value in updates.items():
        setattr(course, field, value)

    total_hours = course.total_hours
    session_duration = course.session_duration
    _apply_duration_sessions(course, total_hours, session_duration)

    if resolved_prerequisite_ids is not None:
        _set_prerequisites(db, org_id, course, resolved_prerequisite_ids)

    roadmap_service.sync_department_roadmap(db, org_id, course.department_id)
    if old_department_id != course.department_id:
        roadmap_service.sync_department_roadmap(db, org_id, old_department_id)

    db.commit()
    db.refresh(course)
    return course
