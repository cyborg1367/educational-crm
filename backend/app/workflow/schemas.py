from pydantic import BaseModel, Field

from app.consultation.enums import ConsultationOutcome


class ConsultationOutcomeUpdate(BaseModel):
    outcome: ConsultationOutcome = Field(
        description="Consultation outcome that triggers workflow routing."
    )
    class_id: int | None = Field(
        default=None,
        description="Target class for pre_enroll outcome. Required if no open class exists for recommended course.",
    )
