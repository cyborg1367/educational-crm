from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.pagination import paginate_query
from app.consultation.model import Consultation
from app.consultation.schemas import ConsultationCreate, ConsultationUpdate
from app.course import service as course_service
from app.department import service as department_service
from app.journey import service as journey_service
from app.person import service as person_service
from app.tenancy.scoping import scoped
from app.user import service as user_service


def list_consultations(
    db: Session, org_id: int, *, limit: int = 50, offset: int = 0
) -> tuple[list[Consultation], int]:
    stmt = scoped(select(Consultation), Consultation, org_id).order_by(
        Consultation.id.desc()
    )
    return paginate_query(db, stmt, limit=limit, offset=offset)


def get_consultation(db: Session, org_id: int, consultation_id: int) -> Consultation:
    stmt = scoped(select(Consultation), Consultation, org_id).where(
        Consultation.id == consultation_id
    )
    consultation = db.scalars(stmt).first()
    if consultation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found"
        )
    return consultation


def _validate_fks(
    db: Session,
    org_id: int,
    *,
    person_id: int,
    department_id: int,
    consultant_id: int,
    journey_id: int | None = None,
    recommended_course_id: int | None = None,
    refer_to_department_id: int | None = None,
) -> None:
    person_service.get_person(db, org_id, person_id)
    department_service.get_department(db, org_id, department_id)
    user_service.get_user(db, org_id, consultant_id)
    if journey_id is not None:
        journey_service.get_journey(db, org_id, journey_id)
    if recommended_course_id is not None:
        course_service.get_course(db, org_id, recommended_course_id)
    if refer_to_department_id is not None:
        department_service.get_department(db, org_id, refer_to_department_id)


def create_consultation(
    db: Session, org_id: int, data: ConsultationCreate
) -> Consultation:
    _validate_fks(
        db,
        org_id,
        person_id=data.person_id,
        department_id=data.department_id,
        consultant_id=data.consultant_id,
        journey_id=data.journey_id,
        recommended_course_id=data.recommended_course_id,
        refer_to_department_id=data.refer_to_department_id,
    )

    consultation = Consultation(
        person_id=data.person_id,
        department_id=data.department_id,
        consultant_id=data.consultant_id,
        journey_id=data.journey_id,
        current_level=data.current_level,
        need=data.need,
        goal=data.goal,
        decision=data.decision,
        recommended_course_id=data.recommended_course_id,
        outcome=data.outcome,
        refer_to_department_id=data.refer_to_department_id,
        next_action=data.next_action,
        next_action_date=data.next_action_date,
        notes=data.notes,
        org_id=org_id,
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return consultation


def update_consultation(
    db: Session, org_id: int, consultation_id: int, data: ConsultationUpdate
) -> Consultation:
    consultation = get_consultation(db, org_id, consultation_id)
    updates = data.model_dump(exclude_unset=True)

    person_id = updates.get("person_id", consultation.person_id)
    department_id = updates.get("department_id", consultation.department_id)
    consultant_id = updates.get("consultant_id", consultation.consultant_id)
    journey_id = updates.get("journey_id", consultation.journey_id)
    recommended_course_id = updates.get(
        "recommended_course_id", consultation.recommended_course_id
    )
    refer_to_department_id = updates.get(
        "refer_to_department_id", consultation.refer_to_department_id
    )

    fk_fields = {
        "person_id",
        "department_id",
        "consultant_id",
        "journey_id",
        "recommended_course_id",
        "refer_to_department_id",
    }
    if fk_fields & updates.keys():
        _validate_fks(
            db,
            org_id,
            person_id=person_id,
            department_id=department_id,
            consultant_id=consultant_id,
            journey_id=journey_id,
            recommended_course_id=recommended_course_id,
            refer_to_department_id=refer_to_department_id,
        )

    for field, value in updates.items():
        setattr(consultation, field, value)

    db.commit()
    db.refresh(consultation)
    return consultation
