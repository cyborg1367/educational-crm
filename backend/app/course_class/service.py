from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.course import service as course_service
from app.course_class.model import CourseClass
from app.course_class.schemas import CourseClassCreate, CourseClassUpdate
from app.tenancy.scoping import scoped
from app.user import service as user_service
from app.user.enums import UserRole


def list_classes(db: Session, org_id: int) -> list[CourseClass]:
    stmt = scoped(select(CourseClass), CourseClass, org_id).order_by(
        CourseClass.start_date.desc(), CourseClass.name
    )
    return list(db.scalars(stmt).all())


def get_class(db: Session, org_id: int, class_id: int) -> CourseClass:
    stmt = scoped(select(CourseClass), CourseClass, org_id).where(
        CourseClass.id == class_id
    )
    course_class = db.scalars(stmt).first()
    if course_class is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Class not found"
        )
    return course_class


def _validate_course(db: Session, org_id: int, course_id: int) -> None:
    course_service.get_course(db, org_id, course_id)


def _validate_teacher(db: Session, org_id: int, teacher_id: int) -> None:
    teacher = user_service.get_user(db, org_id, teacher_id)
    if teacher.role != UserRole.teacher:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="teacher_id must reference a user with role teacher",
        )


def create_class(db: Session, org_id: int, data: CourseClassCreate) -> CourseClass:
    _validate_course(db, org_id, data.course_id)
    _validate_teacher(db, org_id, data.teacher_id)

    course_class = CourseClass(
        course_id=data.course_id,
        teacher_id=data.teacher_id,
        name=data.name,
        start_date=data.start_date,
        end_date=data.end_date,
        status=data.status,
        org_id=org_id,
    )
    db.add(course_class)
    db.commit()
    db.refresh(course_class)
    return course_class


def update_class(
    db: Session, org_id: int, class_id: int, data: CourseClassUpdate
) -> CourseClass:
    course_class = get_class(db, org_id, class_id)
    updates = data.model_dump(exclude_unset=True)

    if "course_id" in updates:
        _validate_course(db, org_id, updates["course_id"])
    if "teacher_id" in updates:
        _validate_teacher(db, org_id, updates["teacher_id"])

    for field, value in updates.items():
        setattr(course_class, field, value)

    db.commit()
    db.refresh(course_class)
    return course_class
