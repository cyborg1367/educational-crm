from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.attendance.model import Attendance
from app.attendance.schemas import AttendanceCreate, AttendanceUpdate
from app.enrollment import service as enrollment_service
from app.tenancy.scoping import scoped


def list_attendances(db: Session, org_id: int) -> list[Attendance]:
    stmt = scoped(select(Attendance), Attendance, org_id).order_by(
        Attendance.session_date.desc(), Attendance.id.desc()
    )
    return list(db.scalars(stmt).all())


def get_attendance(db: Session, org_id: int, attendance_id: int) -> Attendance:
    stmt = scoped(select(Attendance), Attendance, org_id).where(
        Attendance.id == attendance_id
    )
    attendance = db.scalars(stmt).first()
    if attendance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Attendance not found"
        )
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
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance already recorded for this enrollment and session date",
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
