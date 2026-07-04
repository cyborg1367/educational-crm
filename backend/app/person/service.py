from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.core.pagination import paginate_query
from app.person.enums import PersonStatus
from app.person.model import Person
from app.person.schemas import PersonCreate, PersonUpdate
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


def create_person(db: Session, org_id: int, data: PersonCreate) -> Person:
    if data.phone is not None and _phone_taken(db, org_id, data.phone):
        raise ConflictError("Phone already registered")

    person = Person(
        full_name=data.full_name,
        phone=data.phone,
        email=str(data.email) if data.email is not None else None,
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
