from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.consultation.enums import ConsultationOutcome


class ConsultationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique consultation identifier.")
    person_id: int = Field(description="Person being consulted.")
    department_id: int = Field(description="Department conducting the consultation.")
    consultant_id: int = Field(description="Staff user who conducted the consultation.")
    journey_id: int | None = Field(description="Linked journey, if assigned.")
    current_level: str | None = Field(description="Assessed current proficiency level.")
    need: str | None = Field(description="Stated learning need.")
    goal: str | None = Field(description="Stated learning goal.")
    decision: str | None = Field(description="Consultant's recommendation summary.")
    recommended_course_id: int | None = Field(
        description="Course recommended during consultation."
    )
    outcome: ConsultationOutcome | None = Field(
        description="Recorded outcome after follow-up routing."
    )
    refer_to_department_id: int | None = Field(
        description="Target department when outcome is refer_other_dept."
    )
    next_action: str | None = Field(description="Planned next action.")
    next_action_date: date | None = Field(description="Date for the next action.")
    notes: str | None = Field(description="Free-form consultation notes.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class ConsultationCreate(BaseModel):
    person_id: int = Field(description="Person being consulted.")
    department_id: int = Field(description="Department conducting the consultation.")
    consultant_id: int = Field(description="Staff user conducting the consultation.")
    journey_id: int | None = Field(default=None, description="Optional linked journey.")
    current_level: str | None = Field(
        default=None,
        description="Assessed current proficiency level.",
        examples=["A2"],
    )
    need: str | None = Field(default=None, description="Stated learning need.")
    goal: str | None = Field(default=None, description="Stated learning goal.")
    decision: str | None = Field(
        default=None,
        description="Consultant's recommendation summary.",
    )
    recommended_course_id: int | None = Field(
        default=None,
        description="Course recommended during consultation.",
    )
    outcome: ConsultationOutcome | None = Field(
        default=None,
        description="Outcome, if known at creation time.",
    )
    refer_to_department_id: int | None = Field(
        default=None,
        description="Target department for referral outcomes.",
    )
    next_action: str | None = Field(default=None, description="Planned next action.")
    next_action_date: date | None = Field(
        default=None,
        description="Date for the next action.",
    )
    notes: str | None = Field(default=None, description="Optional consultation notes.")


class ConsultationUpdate(BaseModel):
    person_id: int | None = Field(default=None, description="Updated person.")
    department_id: int | None = Field(default=None, description="Updated department.")
    consultant_id: int | None = Field(default=None, description="Updated consultant.")
    journey_id: int | None = Field(default=None, description="Updated journey link.")
    current_level: str | None = Field(default=None, description="Updated level.")
    need: str | None = Field(default=None, description="Updated need.")
    goal: str | None = Field(default=None, description="Updated goal.")
    decision: str | None = Field(default=None, description="Updated decision.")
    recommended_course_id: int | None = Field(
        default=None,
        description="Updated recommended course.",
    )
    outcome: ConsultationOutcome | None = Field(
        default=None,
        description="Updated outcome.",
    )
    refer_to_department_id: int | None = Field(
        default=None,
        description="Updated referral department.",
    )
    next_action: str | None = Field(default=None, description="Updated next action.")
    next_action_date: date | None = Field(
        default=None,
        description="Updated next action date.",
    )
    notes: str | None = Field(default=None, description="Updated notes.")
