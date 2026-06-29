from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.core.db import get_db
from app.core.openapi import PROTECTED_RESPONSES
from app.reports import service as reports_service
from app.reports.schemas import CollectionRate, EnrollmentTrends, RevenueSummary
from app.user.model import User

router = APIRouter(responses=PROTECTED_RESPONSES)


@router.get("/revenue", response_model=RevenueSummary)
def revenue_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    year: Annotated[int, Query(ge=2000, le=2100)],
) -> RevenueSummary:
    """Revenue summary for a calendar year.

    Aggregates paid and partially-paid invoice totals by month and course.
    """
    return reports_service.get_revenue_summary(db, current_user.org_id, year)


@router.get("/enrollments", response_model=EnrollmentTrends)
def enrollment_trends(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    year: Annotated[int, Query(ge=2000, le=2100)],
) -> EnrollmentTrends:
    """Enrollment trends for a calendar year.

    Counts enrollments by creation month and course.
    """
    return reports_service.get_enrollment_trends(db, current_user.org_id, year)


@router.get("/collection", response_model=CollectionRate)
def collection_rate(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CollectionRate:
    """Collection rate across all non-void invoices.

    Compares total invoiced amounts to total payments recorded.
    """
    return reports_service.get_collection_rate(db, current_user.org_id)
