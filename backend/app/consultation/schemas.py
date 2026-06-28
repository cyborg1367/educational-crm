from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.consultation.enums import ConsultationOutcome


class ConsultationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: int
    department_id: int
    consultant_id: int
    journey_id: int | None
    current_level: str | None
    need: str | None
    goal: str | None
    decision: str | None
    recommended_course_id: int | None
    outcome: ConsultationOutcome | None
    refer_to_department_id: int | None
    next_action: str | None
    next_action_date: date | None
    notes: str | None
    org_id: int
    created_at: datetime
    updated_at: datetime


class ConsultationCreate(BaseModel):
    person_id: int
    department_id: int
    consultant_id: int
    journey_id: int | None = None
    current_level: str | None = None
    need: str | None = None
    goal: str | None = None
    decision: str | None = None
    recommended_course_id: int | None = None
    outcome: ConsultationOutcome | None = None
    refer_to_department_id: int | None = None
    next_action: str | None = None
    next_action_date: date | None = None
    notes: str | None = None


class ConsultationUpdate(BaseModel):
    person_id: int | None = None
    department_id: int | None = None
    consultant_id: int | None = None
    journey_id: int | None = None
    current_level: str | None = None
    need: str | None = None
    goal: str | None = None
    decision: str | None = None
    recommended_course_id: int | None = None
    outcome: ConsultationOutcome | None = None
    refer_to_department_id: int | None = None
    next_action: str | None = None
    next_action_date: date | None = None
    notes: str | None = None
