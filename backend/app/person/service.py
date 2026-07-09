from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.activity import service as activity_service
from app.activity.model import Activity
from app.attendance.model import Attendance
from app.attendance.waiver_model import JourneyRoadmapWaiver
from app.communication.model import Communication
from app.consultation.model import Consultation
from app.core.errors import ConflictError, NotFoundError
from app.core.pagination import paginate_query
from app.enrollment.model import Enrollment
from app.finance.model import Installment, Invoice, Payment, Refund
from app.journey.model import Journey
from app.person.enums import PersonStatus
from app.person.model import Person
from app.person.schemas import PersonCreate, PersonUpdate
from app.task.model import Task
from app.tenancy.scoping import scoped


def _phone_taken(db: Session, org_id: int, phone: str, exclude_id: int | None = None) -> bool:
    stmt = scoped(select(Person), Person, org_id).where(Person.phone == phone)
    if exclude_id is not None:
        stmt = stmt.where(Person.id != exclude_id)
    return db.scalars(stmt).first() is not None


def list_people(
    db: Session,
    org_id: int,
    *,
    status: PersonStatus | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Person], int]:
    stmt = scoped(select(Person), Person, org_id).order_by(Person.full_name)
    if status is not None:
        stmt = stmt.where(Person.status == status)
    return paginate_query(db, stmt, limit=limit, offset=offset)


def get_person(db: Session, org_id: int, person_id: int) -> Person:
    stmt = scoped(select(Person), Person, org_id).where(Person.id == person_id)
    person = db.scalars(stmt).first()
    if person is None:
        raise NotFoundError("Person not found")
    return person


def create_person(
    db: Session,
    org_id: int,
    data: PersonCreate,
    *,
    actor_id: int | None = None,
) -> Person:
    if data.phone is not None and _phone_taken(db, org_id, data.phone):
        raise ConflictError("Phone already registered")

    person = Person(
        full_name=data.full_name,
        phone=data.phone,
        email=str(data.email) if data.email is not None else None,
        birth_date=data.birth_date,
        gender=data.gender,
        address=data.address,
        interests=data.interests,
        interests_note=data.interests_note,
        source=data.source,
        notes=data.notes,
        org_id=org_id,
    )
    db.add(person)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("Phone already registered") from None
    db.refresh(person)

    payload: dict[str, str] = {"status": person.status.value}
    if person.source is not None:
        payload["source"] = person.source

    activity_service.log_activity(
        db,
        org_id,
        person.id,
        "person_created",
        payload=payload,
        actor_id=actor_id,
    )
    return person


def update_person(db: Session, org_id: int, person_id: int, data: PersonUpdate) -> Person:
    person = get_person(db, org_id, person_id)
    updates = data.model_dump(exclude_unset=True)

    if "phone" in updates and updates["phone"] is not None:
        if _phone_taken(db, org_id, updates["phone"], exclude_id=person_id):
            raise ConflictError("Phone already registered")

    if "email" in updates and updates["email"] is not None:
        updates["email"] = str(updates["email"])

    for field, value in updates.items():
        setattr(person, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("Phone already registered") from None
    db.refresh(person)
    return person


def _delete_person_finance_chain(
    db: Session, org_id: int, enrollment_ids: list[int]
) -> None:
    if not enrollment_ids:
        return

    invoice_ids = list(
        db.scalars(
            select(Invoice.id).where(
                Invoice.org_id == org_id,
                Invoice.enrollment_id.in_(enrollment_ids),
            )
        ).all()
    )
    if not invoice_ids:
        db.execute(
            delete(Attendance).where(
                Attendance.org_id == org_id,
                Attendance.enrollment_id.in_(enrollment_ids),
            )
        )
        return

    installment_ids = list(
        db.scalars(
            select(Installment.id).where(
                Installment.org_id == org_id,
                Installment.invoice_id.in_(invoice_ids),
            )
        ).all()
    )
    if installment_ids:
        payment_ids = list(
            db.scalars(
                select(Payment.id).where(
                    Payment.org_id == org_id,
                    Payment.installment_id.in_(installment_ids),
                )
            ).all()
        )
        if payment_ids:
            db.execute(
                delete(Refund).where(
                    Refund.org_id == org_id,
                    Refund.payment_id.in_(payment_ids),
                )
            )
            db.execute(
                delete(Payment).where(
                    Payment.org_id == org_id,
                    Payment.id.in_(payment_ids),
                )
            )
        db.execute(
            delete(Installment).where(
                Installment.org_id == org_id,
                Installment.id.in_(installment_ids),
            )
        )

    db.execute(
        delete(Invoice).where(
            Invoice.org_id == org_id,
            Invoice.id.in_(invoice_ids),
        )
    )
    db.execute(
        delete(Attendance).where(
            Attendance.org_id == org_id,
            Attendance.enrollment_id.in_(enrollment_ids),
        )
    )


def delete_person(db: Session, org_id: int, person_id: int) -> None:
    """Hard-delete a person and dependent rows (development use)."""
    person = get_person(db, org_id, person_id)

    enrollment_ids = list(
        db.scalars(
            select(Enrollment.id).where(
                Enrollment.org_id == org_id,
                Enrollment.person_id == person_id,
            )
        ).all()
    )
    _delete_person_finance_chain(db, org_id, enrollment_ids)

    if enrollment_ids:
        db.execute(
            delete(Enrollment).where(
                Enrollment.org_id == org_id,
                Enrollment.id.in_(enrollment_ids),
            )
        )

    db.execute(
        delete(Consultation).where(
            Consultation.org_id == org_id,
            Consultation.person_id == person_id,
        )
    )

    journey_ids = list(
        db.scalars(
            select(Journey.id).where(
                Journey.org_id == org_id,
                Journey.person_id == person_id,
            )
        ).all()
    )
    if journey_ids:
        db.execute(
            delete(JourneyRoadmapWaiver).where(
                JourneyRoadmapWaiver.org_id == org_id,
                JourneyRoadmapWaiver.journey_id.in_(journey_ids),
            )
        )
        db.execute(
            delete(Journey).where(
                Journey.org_id == org_id,
                Journey.id.in_(journey_ids),
            )
        )

    db.execute(
        delete(Task).where(
            Task.org_id == org_id,
            Task.person_id == person_id,
        )
    )
    db.execute(
        delete(Communication).where(
            Communication.org_id == org_id,
            Communication.person_id == person_id,
        )
    )
    db.execute(
        delete(Activity).where(
            Activity.org_id == org_id,
            Activity.person_id == person_id,
        )
    )

    db.delete(person)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError(
            "Cannot delete person while related records still exist"
        ) from exc
