"""SMS notification helpers — failures are logged and never block callers."""

from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.core.logging_config import get_logger
from app.notifications.sms import send_sms
from app.person import service as person_service

logger = get_logger(__name__)


def _send_to_person(
    db: Session, org_id: int, person_id: int, message: str
) -> None:
    try:
        person = person_service.get_person(db, org_id, person_id)
        if not person.phone:
            logger.info(
                "sms_skipped",
                extra={
                    "event": "sms_skipped",
                    "reason": "no_phone",
                    "person_id": person_id,
                },
            )
            return
        send_sms(person.phone, message)
    except Exception:
        logger.exception(
            "sms_notify_failed",
            extra={"event": "sms_notify_failed", "person_id": person_id},
        )


def notify_overdue_installment(
    db: Session,
    org_id: int,
    person_id: int,
    installment_id: int,
    due_date: date,
) -> None:
    message = (
        f"Reminder: installment #{installment_id} was due on {due_date.isoformat()}. "
        "Please contact us to arrange payment. — EduCRM"
    )
    _send_to_person(db, org_id, person_id, message)


def notify_pre_enroll_unpaid(
    db: Session, org_id: int, person_id: int, days_unpaid: int
) -> None:
    message = (
        f"Your pre-enrollment payment has been outstanding for {days_unpaid} days. "
        "Please complete payment to secure your place. — EduCRM"
    )
    _send_to_person(db, org_id, person_id, message)


def notify_payment_recorded(
    db: Session, org_id: int, person_id: int, amount: int
) -> None:
    message = (
        f"Your payment of {amount:,} Toman has been recorded. Thank you! — EduCRM"
    )
    _send_to_person(db, org_id, person_id, message)


def notify_class_starts_tomorrow(
    db: Session, org_id: int, person_id: int, class_name: str
) -> None:
    message = (
        f'Reminder: your class "{class_name}" starts tomorrow. '
        "We look forward to seeing you! — EduCRM"
    )
    _send_to_person(db, org_id, person_id, message)
