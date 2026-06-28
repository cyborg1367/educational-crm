from pydantic import BaseModel

from app.consultation.enums import ConsultationOutcome


class ConsultationOutcomeUpdate(BaseModel):
    outcome: ConsultationOutcome
    class_id: int | None = None
