from sqlalchemy import extract, func, select
from sqlalchemy.orm import Session

from app.course.model import Course
from app.course_class.model import CourseClass
from app.enrollment.model import Enrollment
from app.finance.enums import InvoiceStatus
from app.finance.model import Invoice, Payment
from app.reports.schemas import (
    CollectionRate,
    EnrollmentCourse,
    EnrollmentMonth,
    EnrollmentTrends,
    RevenueCourse,
    RevenueMonth,
    RevenueSummary,
)
from app.tenancy.scoping import scoped

_PAID_INVOICE_STATUSES = (InvoiceStatus.paid, InvoiceStatus.partially_paid)


def _month_label(year: int, month_num: int) -> str:
    return f"{year}-{month_num:02d}"


def get_revenue_summary(db: Session, org_id: int, year: int) -> RevenueSummary:
    base_filters = (
        Invoice.org_id == org_id,
        Invoice.status.in_(_PAID_INVOICE_STATUSES),
        extract("year", Invoice.created_at) == year,
    )

    total_revenue = db.scalar(
        select(func.coalesce(func.sum(Invoice.total_amount), 0)).where(*base_filters)
    )
    total_revenue = int(total_revenue or 0)

    month_rows = db.execute(
        select(
            extract("month", Invoice.created_at).label("month_num"),
            func.coalesce(func.sum(Invoice.total_amount), 0).label("amount"),
        )
        .where(*base_filters)
        .group_by(extract("month", Invoice.created_at))
        .order_by(extract("month", Invoice.created_at))
    ).all()
    by_month = [
        RevenueMonth(
            month=_month_label(year, int(row.month_num)),
            amount=int(row.amount),
        )
        for row in month_rows
    ]

    course_rows = db.execute(
        select(
            Course.id,
            Course.title,
            func.coalesce(func.sum(Invoice.total_amount), 0).label("amount"),
        )
        .select_from(Invoice)
        .join(Enrollment, Invoice.enrollment_id == Enrollment.id)
        .join(CourseClass, Enrollment.class_id == CourseClass.id)
        .join(Course, CourseClass.course_id == Course.id)
        .where(*base_filters)
        .group_by(Course.id, Course.title)
        .order_by(func.sum(Invoice.total_amount).desc())
    ).all()
    by_course = [
        RevenueCourse(
            course_id=row.id,
            course_name=row.title,
            amount=int(row.amount),
        )
        for row in course_rows
    ]

    return RevenueSummary(
        total_revenue=total_revenue,
        by_month=by_month,
        by_course=by_course,
    )


def get_enrollment_trends(db: Session, org_id: int, year: int) -> EnrollmentTrends:
    base_filters = (
        Enrollment.org_id == org_id,
        extract("year", Enrollment.created_at) == year,
    )

    total_enrollments = db.scalar(
        select(func.count()).select_from(Enrollment).where(*base_filters)
    )
    total_enrollments = int(total_enrollments or 0)

    month_rows = db.execute(
        select(
            extract("month", Enrollment.created_at).label("month_num"),
            func.count().label("count"),
        )
        .where(*base_filters)
        .group_by(extract("month", Enrollment.created_at))
        .order_by(extract("month", Enrollment.created_at))
    ).all()
    by_month = [
        EnrollmentMonth(
            month=_month_label(year, int(row.month_num)),
            count=int(row.count),
        )
        for row in month_rows
    ]

    course_rows = db.execute(
        select(
            Course.id,
            Course.title,
            func.count().label("count"),
        )
        .select_from(Enrollment)
        .join(CourseClass, Enrollment.class_id == CourseClass.id)
        .join(Course, CourseClass.course_id == Course.id)
        .where(*base_filters)
        .group_by(Course.id, Course.title)
        .order_by(func.count().desc())
    ).all()
    by_course = [
        EnrollmentCourse(
            course_id=row.id,
            course_name=row.title,
            count=int(row.count),
        )
        for row in course_rows
    ]

    return EnrollmentTrends(
        total_enrollments=total_enrollments,
        by_month=by_month,
        by_course=by_course,
    )


def get_collection_rate(db: Session, org_id: int) -> CollectionRate:
    total_invoiced = db.scalar(
        scoped(
            select(func.coalesce(func.sum(Invoice.total_amount), 0)),
            Invoice,
            org_id,
        ).where(Invoice.status != InvoiceStatus.void)
    )
    total_invoiced = int(total_invoiced or 0)

    total_paid = db.scalar(
        scoped(
            select(func.coalesce(func.sum(Payment.amount), 0)),
            Payment,
            org_id,
        )
    )
    total_paid = int(total_paid or 0)

    if total_invoiced > 0:
        collection_rate_percent = round(total_paid / total_invoiced * 100, 2)
    else:
        collection_rate_percent = 0.0

    pending_amount = total_invoiced - total_paid

    return CollectionRate(
        total_invoiced=total_invoiced,
        total_paid=total_paid,
        collection_rate_percent=collection_rate_percent,
        pending_amount=pending_amount,
    )
