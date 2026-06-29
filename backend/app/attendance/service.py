from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.core.pagination import paginate_query
from app.attendance.model import Attendance
from app.attendance.schemas import AttendanceCreate, AttendanceUpdate
from app.enrollment import service as enrollment_service
from app.tenancy.scoping import scoped


def list_attendances(
    db: Session, org_id: int, *, limit: int = 50, offset: int = 0
) -> tuple[list[Attendance], int]:
    stmt = scoped(select(Attendance), Attendance, org_id).order_by(
        Attendance.session_date.desc(), Attendance.id.desc()
    )
    return paginate_query(db, stmt, limit=limit, offset=offset)


def get_attendance(db: Session, org_id: int, attendance_id: int) -> Attendance:
    stmt = scoped(select(Attendance), Attendance, org_id).where(
        Attendance.id == attendance_id
    )
    attendance = db.scalars(stmt).first()
    if attendance is None:
        raise NotFoundError("Attendance not found")
    return attendance


def create_attendance(
    db: Session, org_id: int, data: AttendanceCreate
) -> Attendance:
    enrollment_service.get_enrollment(db, org_id, data.enrollment_id)

    attendance = Attendance(
        enrollment_id=data.enrollment_id,
        session_date=data.session_date,
        present=data.present,
        notes=data.notes,
        org_id=org_id,
    )
    db.add(attendance)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(
            "Attendance already recorded for this enrollment and session date"
        ) from None
    db.refresh(attendance)
    return attendance


def update_attendance(
    db: Session, org_id: int, attendance_id: int, data: AttendanceUpdate
) -> Attendance:
    attendance = get_attendance(db, org_id, attendance_id)
    updates = data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(attendance, field, value)

    db.commit()
    db.refresh(attendance)
    return attendance
