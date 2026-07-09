from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.journey.enums import JourneyStatus


class AttendanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Unique attendance record identifier.")
    enrollment_id: int = Field(description="Enrollment this session belongs to.")
    session_date: date = Field(description="Date of the class session.")
    present: bool = Field(description="Whether the student was present.")
    notes: str | None = Field(description="Optional session notes.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class AttendanceCreate(BaseModel):
    enrollment_id: int = Field(description="Enrollment to record attendance for.")
    session_date: date = Field(description="Date of the class session.")
    present: bool = Field(description="Whether the student was present.")
    notes: str | None = Field(default=None, description="Optional session notes.")


class AttendanceUpdate(BaseModel):
    present: bool | None = Field(
        default=None,
        description="Updated presence status.",
    )
    notes: str | None = Field(default=None, description="Updated session notes.")


class RoadmapStepStatus(str, Enum):
    completed = "completed"
    waived = "waived"
    active = "active"
    pre_enroll = "pre_enroll"
    locked = "locked"
    upcoming = "upcoming"


class RoadmapStepProgress(BaseModel):
    item_id: int = Field(description="Roadmap item identifier.")
    sequence: int = Field(description="Step order within the roadmap.")
    title: str = Field(description="Step title.")
    course_id: int | None = Field(description="Linked course, if any.")
    course_title: str | None = Field(description="Linked course title, if any.")
    status: RoadmapStepStatus = Field(description="Computed step status for the person.")
    enrollment_id: int | None = Field(
        default=None,
        description="Enrollment driving this step status, if any.",
    )
    waiver_id: int | None = Field(
        default=None,
        description="Waiver granting credit for this step, if any.",
    )


class JourneyRoadmapWaiverRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Waiver identifier.")
    journey_id: int = Field(description="Journey this waiver belongs to.")
    roadmap_item_id: int = Field(description="Waived roadmap item.")
    course_id: int | None = Field(description="Course linked to the item, if any.")
    reason: str = Field(description="Why the step was waived.")
    waived_by: int = Field(description="Staff user who recorded the waiver.")
    org_id: int = Field(description="Owning organization. Immutable.")
    created_at: datetime = Field(description="Record creation timestamp (UTC).")
    updated_at: datetime = Field(description="Last update timestamp (UTC).")


class JourneyRoadmapWaiverCreate(BaseModel):
    roadmap_item_id: int = Field(description="Roadmap item to waive.")
    reason: str = Field(
        min_length=3,
        max_length=2000,
        description="Reason for placement / waiver.",
    )


class PersonJourneyProgress(BaseModel):
    journey_id: int = Field(description="Journey identifier.")
    department_id: int = Field(description="Department for this journey.")
    department_name: str = Field(description="Department display name.")
    roadmap_id: int = Field(description="Resolved roadmap identifier.")
    roadmap_name: str = Field(description="Roadmap display name.")
    journey_status: JourneyStatus = Field(description="Current journey status.")
    current_item_id: int | None = Field(
        default=None,
        description="Primary current item (first of current_item_ids).",
    )
    current_item_ids: list[int] = Field(
        default_factory=list,
        description="All in-progress steps, or next actionable steps when none in progress.",
    )
    completed_count: int = Field(description="Number of completed course steps.")
    waived_count: int = Field(description="Number of waived course steps.")
    credited_count: int = Field(
        description="completed_count + waived_count (credited progress)."
    )
    total_count: int = Field(description="Number of course-linked steps.")
    has_path_gap: bool = Field(
        description="True when earlier steps lack credit before a live enrollment."
    )
    gap_item_ids: list[int] = Field(
        default_factory=list,
        description="Roadmap item ids that form the path gap.",
    )
    steps: list[RoadmapStepProgress] = Field(
        default_factory=list,
        description="Ordered roadmap steps with computed status.",
    )


class PersonRoadmapProgressRead(BaseModel):
    person_id: int = Field(description="Person identifier.")
    journeys: list[PersonJourneyProgress] = Field(
        default_factory=list,
        description="Progress per journey with a resolvable roadmap.",
    )
    selected_journey_id: int | None = Field(
        default=None,
        description="Journey highlighted in the response (query override or default).",
    )
