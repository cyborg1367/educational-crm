from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.attendance import service as attendance_service
from app.attendance.model import Attendance
from app.attendance.schemas import AttendanceCreate, AttendanceRead, AttendanceUpdate
from app.auth.deps import get_current_user
from app.core.db import get_db
from app.user.model import User

router = APIRouter()


@router.get("", response_model=list[AttendanceRead])
def list_attendances(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Attendance]:
    return attendance_service.list_attendances(db, current_user.org_id)


@router.get("/{attendance_id}", response_model=AttendanceRead)
def get_attendance(
    attendance_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Attendance:
    return attendance_service.get_attendance(db, current_user.org_id, attendance_id)


@router.post("", response_model=AttendanceRead, status_code=status.HTTP_201_CREATED)
def create_attendance(
    body: AttendanceCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Attendance:
    return attendance_service.create_attendance(db, current_user.org_id, body)


@router.patch("/{attendance_id}", response_model=AttendanceRead)
def update_attendance(
    attendance_id: int,
    body: AttendanceUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Attendance:
    return attendance_service.update_attendance(
        db, current_user.org_id, attendance_id, body
    )
