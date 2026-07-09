from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.pagination import paginate_query
from app.communication.model import Communication
from app.communication.schemas import CommunicationCreate
from app.person import service as person_service
from app.tenancy.scoping import scoped


def list_communications(
    db: Session,
    org_id: int,
    *,
    person_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Communication], int]:
    stmt = scoped(select(Communication), Communication, org_id).order_by(
        Communication.created_at.desc()
    )
    if person_id is not None:
        stmt = stmt.where(Communication.person_id == person_id)
    return paginate_query(db, stmt, limit=limit, offset=offset)


def log_communication(
    db: Session, org_id: int, data: CommunicationCreate
) -> Communication:
    person_service.get_person(db, org_id, data.person_id)

    communication = Communication(
        person_id=data.person_id,
        channel=data.channel,
        direction=data.direction,
        content=data.content,
        metadata_=data.metadata,
        org_id=org_id,
    )
    db.add(communication)
    db.commit()
    db.refresh(communication)
    return communication
