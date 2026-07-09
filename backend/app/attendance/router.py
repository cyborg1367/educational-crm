from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.attendance import service as attendance_service
from app.attendance.model import Attendance
from app.attendance.schemas import AttendanceCreate, AttendanceRead, AttendanceUpdate
from app.auth.deps import get_current_user
from app.core.db import get_db
from app.core.openapi import PROTECTED_RESPONSES
from app.core.pagination import PaginatedResponse, PaginationParams
from app.user.model import User

router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("", response_model=PaginatedResponse[AttendanceRead])
def list_attendances(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
) -> PaginatedResponse[AttendanceRead]:
    """List attendance records.

    Returns a paginated list of attendance entries in the organization.
    """
    items, total_count = attendance_service.list_attendances(
        db,
        current_user.org_id,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return PaginatedResponse.from_page(
        items,
        total_count,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.get("/{attendance_id}", response_model=AttendanceRead)
def get_attendance(
    attendance_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Attendance:
    """Get an attendance record by ID.

    Fetches a single session attendance entry.
    Returns 404 if the attendance record is not found in the org.
    """
    return attendance_service.get_attendance(db, current_user.org_id, attendance_id)


@router.post("", response_model=AttendanceRead, status_code=status.HTTP_201_CREATED)
def create_attendance(
    body: AttendanceCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Attendance:
    """Record attendance for a session.

    Logs presence or absence for an enrollment on a given session date.
    Returns 404 if the enrollment is not found.
    Returns 409 if attendance already exists for this enrollment and date.
    Returns 422 if request validation fails.
    """
    return attendance_service.create_attendance(db, current_user.org_id, body)


@router.patch("/{attendance_id}", response_model=AttendanceRead)
def update_attendance(
    attendance_id: int,
    body: AttendanceUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Attendance:
    """Update an attendance record.

    Changes presence status or notes for an existing session.
    Returns 404 if the attendance record is not found.
    Returns 422 if request validation fails.
    """
    return attendance_service.update_attendance(
        db, current_user.org_id, attendance_id, body
    )
