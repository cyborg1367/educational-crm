from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.activity import service as activity_service
from app.attendance.schemas import (
    JourneyRoadmapWaiverCreate,
    PersonJourneyProgress,
    PersonRoadmapProgressRead,
    RoadmapStepProgress,
    RoadmapStepStatus,
)
from app.attendance.waiver_model import JourneyRoadmapWaiver
from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.course.model import CoursePrerequisite
from app.course_class.model import CourseClass
from app.department.model import Department
from app.enrollment.enums import EnrollmentStatus
from app.enrollment.model import Enrollment
from app.journey.enums import JourneyStatus
from app.journey.model import Journey
from app.person import service as person_service
from app.roadmap.model import Roadmap, RoadmapItem
from app.tenancy.scoping import scoped

_ENROLLMENT_PRIORITY: dict[EnrollmentStatus, int] = {
    EnrollmentStatus.completed: 3,
    EnrollmentStatus.active: 2,
    EnrollmentStatus.pre_enroll: 1,
    EnrollmentStatus.dropped: 0,
}

_CREDITED_STATUSES = {RoadmapStepStatus.completed, RoadmapStepStatus.waived}
_LIVE_ENROLLMENT_STATUSES = {
    EnrollmentStatus.completed,
    EnrollmentStatus.active,
    EnrollmentStatus.pre_enroll,
}


def _resolve_roadmap(
    db: Session, org_id: int, journey: Journey
) -> Roadmap | None:
    if journey.roadmap_id is not None:
        stmt = scoped(select(Roadmap), Roadmap, org_id).where(
            Roadmap.id == journey.roadmap_id
        )
        roadmap = db.scalars(stmt).first()
        if roadmap is not None:
            return roadmap

    stmt = (
        scoped(select(Roadmap), Roadmap, org_id)
        .where(
            Roadmap.department_id == journey.department_id,
            Roadmap.is_active.is_(True),
        )
        .order_by(Roadmap.id)
    )
    return db.scalars(stmt).first()


def _load_course_enrollments(
    db: Session, org_id: int, person_id: int
) -> dict[int, tuple[EnrollmentStatus, int]]:
    stmt = (
        scoped(select(Enrollment), Enrollment, org_id)
        .join(CourseClass, Enrollment.class_id == CourseClass.id)
        .where(Enrollment.person_id == person_id)
    )
    enrollments = list(db.scalars(stmt).all())
    class_ids = {enrollment.class_id for enrollment in enrollments}
    if not class_ids:
        return {}

    class_stmt = scoped(select(CourseClass), CourseClass, org_id).where(
        CourseClass.id.in_(class_ids)
    )
    classes_by_id = {
        course_class.id: course_class for course_class in db.scalars(class_stmt).all()
    }

    best_by_course: dict[int, tuple[EnrollmentStatus, int]] = {}
    for enrollment in enrollments:
        if enrollment.status == EnrollmentStatus.dropped:
            continue
        course_class = classes_by_id.get(enrollment.class_id)
        if course_class is None:
            continue
        course_id = course_class.course_id
        current = best_by_course.get(course_id)
        if current is None or _ENROLLMENT_PRIORITY[enrollment.status] > _ENROLLMENT_PRIORITY[
            current[0]
        ]:
            best_by_course[course_id] = (enrollment.status, enrollment.id)
    return best_by_course


def _load_prerequisites_by_course(
    db: Session, org_id: int, course_ids: set[int]
) -> dict[int, list[int]]:
    if not course_ids:
        return {}
    stmt = scoped(select(CoursePrerequisite), CoursePrerequisite, org_id).where(
        CoursePrerequisite.course_id.in_(course_ids)
    )
    prerequisites_by_course: dict[int, list[int]] = {
        course_id: [] for course_id in course_ids
    }
    for link in db.scalars(stmt).all():
        prerequisites_by_course.setdefault(link.course_id, []).append(
            link.prerequisite_course_id
        )
    return prerequisites_by_course


def _load_waivers_by_item(
    db: Session, org_id: int, journey_id: int
) -> dict[int, JourneyRoadmapWaiver]:
    stmt = scoped(select(JourneyRoadmapWaiver), JourneyRoadmapWaiver, org_id).where(
        JourneyRoadmapWaiver.journey_id == journey_id
    )
    return {waiver.roadmap_item_id: waiver for waiver in db.scalars(stmt).all()}


def _is_course_credited(
    course_id: int,
    enrollment_by_course: dict[int, tuple[EnrollmentStatus, int]],
    waived_course_ids: set[int],
) -> bool:
    if course_id in waived_course_ids:
        return True
    status = enrollment_by_course.get(course_id)
    return status is not None and status[0] == EnrollmentStatus.completed


def _step_status_for_item(
    item: RoadmapItem,
    enrollment_by_course: dict[int, tuple[EnrollmentStatus, int]],
    prerequisites_by_course: dict[int, list[int]],
    waivers_by_item: dict[int, JourneyRoadmapWaiver],
    waived_course_ids: set[int],
) -> tuple[RoadmapStepStatus, int | None, int | None]:
    waiver = waivers_by_item.get(item.id)

    if item.course_id is not None:
        enrollment = enrollment_by_course.get(item.course_id)
        if enrollment is not None:
            status, enrollment_id = enrollment
            if status == EnrollmentStatus.completed:
                return RoadmapStepStatus.completed, enrollment_id, None
            if status == EnrollmentStatus.active:
                return RoadmapStepStatus.active, enrollment_id, None
            if status == EnrollmentStatus.pre_enroll:
                return RoadmapStepStatus.pre_enroll, enrollment_id, None

    if waiver is not None:
        return RoadmapStepStatus.waived, None, waiver.id

    if item.course_id is None:
        return RoadmapStepStatus.upcoming, None, None

    prerequisites = prerequisites_by_course.get(item.course_id, [])
    if prerequisites and not all(
        _is_course_credited(prerequisite_id, enrollment_by_course, waived_course_ids)
        for prerequisite_id in prerequisites
    ):
        return RoadmapStepStatus.locked, None, None

    return RoadmapStepStatus.upcoming, None, None


def _current_item_ids(steps: list[RoadmapStepProgress]) -> list[int]:
    in_progress = sorted(
        [
            step
            for step in steps
            if step.status in (RoadmapStepStatus.active, RoadmapStepStatus.pre_enroll)
        ],
        key=lambda step: step.sequence,
    )
    if in_progress:
        return [step.item_id for step in in_progress]

    last_credited_sequence = max(
        (step.sequence for step in steps if step.status in _CREDITED_STATUSES),
        default=None,
    )
    next_upcomings: list[int] = []
    for step in steps:
        if step.status != RoadmapStepStatus.upcoming:
            continue
        if last_credited_sequence is None or step.sequence > last_credited_sequence:
            next_upcomings.append(step.item_id)
    # Parallel next steps: keep all unlockable upcomings at the earliest sequence.
    if not next_upcomings:
        return []
    earliest = min(
        step.sequence
        for step in steps
        if step.item_id in next_upcomings
    )
    return [
        step.item_id
        for step in steps
        if step.item_id in next_upcomings and step.sequence == earliest
    ]


def _compute_path_gap(steps: list[RoadmapStepProgress]) -> tuple[bool, list[int]]:
    live_steps = [
        step
        for step in steps
        if step.course_id is not None
        and step.status
        in (
            RoadmapStepStatus.completed,
            RoadmapStepStatus.active,
            RoadmapStepStatus.pre_enroll,
        )
    ]
    if not live_steps:
        return False, []

    anchor_sequence = min(step.sequence for step in live_steps)
    gap_item_ids = [
        step.item_id
        for step in steps
        if step.course_id is not None
        and step.sequence < anchor_sequence
        and step.status not in _CREDITED_STATUSES
    ]
    return bool(gap_item_ids), gap_item_ids


def _build_journey_progress(
    db: Session,
    org_id: int,
    journey: Journey,
    department_name: str,
    enrollment_by_course: dict[int, tuple[EnrollmentStatus, int]],
) -> PersonJourneyProgress | None:
    roadmap = _resolve_roadmap(db, org_id, journey)
    if roadmap is None:
        return None

    items_stmt = (
        scoped(select(RoadmapItem), RoadmapItem, org_id)
        .where(RoadmapItem.roadmap_id == roadmap.id)
        .order_by(RoadmapItem.sequence)
        .options(selectinload(RoadmapItem.course))
    )
    items = list(db.scalars(items_stmt).all())

    course_ids = {item.course_id for item in items if item.course_id is not None}
    prerequisites_by_course = _load_prerequisites_by_course(db, org_id, course_ids)
    waivers_by_item = _load_waivers_by_item(db, org_id, journey.id)
    waived_course_ids = {
        waiver.course_id
        for waiver in waivers_by_item.values()
        if waiver.course_id is not None
    }

    steps: list[RoadmapStepProgress] = []
    for item in items:
        status, enrollment_id, waiver_id = _step_status_for_item(
            item,
            enrollment_by_course,
            prerequisites_by_course,
            waivers_by_item,
            waived_course_ids,
        )
        steps.append(
            RoadmapStepProgress(
                item_id=item.id,
                sequence=item.sequence,
                title=item.title,
                course_id=item.course_id,
                course_title=item.course.title if item.course else None,
                status=status,
                enrollment_id=enrollment_id,
                waiver_id=waiver_id,
            )
        )

    course_steps = [step for step in steps if step.course_id is not None]
    completed_count = sum(
        1 for step in course_steps if step.status == RoadmapStepStatus.completed
    )
    waived_count = sum(
        1 for step in course_steps if step.status == RoadmapStepStatus.waived
    )
    has_path_gap, gap_item_ids = _compute_path_gap(steps)
    current_item_ids = _current_item_ids(steps)

    return PersonJourneyProgress(
        journey_id=journey.id,
        department_id=journey.department_id,
        department_name=department_name,
        roadmap_id=roadmap.id,
        roadmap_name=roadmap.name,
        journey_status=journey.status,
        current_item_id=current_item_ids[0] if current_item_ids else None,
        current_item_ids=current_item_ids,
        completed_count=completed_count,
        waived_count=waived_count,
        credited_count=completed_count + waived_count,
        total_count=len(course_steps),
        has_path_gap=has_path_gap,
        gap_item_ids=gap_item_ids,
        steps=steps,
    )


def find_prior_uncertified_steps_for_course(
    db: Session,
    org_id: int,
    person_id: int,
    course_id: int,
) -> tuple[int | None, list[int]]:
    """Return (journey_id, gap_item_ids) if enrolling in course sits after uncredited steps.

    Soft check only — used for warnings / Activity. Empty gap means no path gap.
    """
    # Locate journeys/roadmaps that include this course.
    items_stmt = scoped(select(RoadmapItem), RoadmapItem, org_id).where(
        RoadmapItem.course_id == course_id
    )
    matching_items = list(db.scalars(items_stmt).all())
    if not matching_items:
        return None, []

    enrollment_by_course = _load_course_enrollments(db, org_id, person_id)
    journeys_stmt = (
        scoped(select(Journey), Journey, org_id)
        .where(Journey.person_id == person_id)
        .order_by(Journey.id)
    )
    journeys = list(db.scalars(journeys_stmt).all())
    if not journeys:
        return None, []

    for journey in journeys:
        roadmap = _resolve_roadmap(db, org_id, journey)
        if roadmap is None:
            continue
        roadmap_items = list(
            db.scalars(
                scoped(select(RoadmapItem), RoadmapItem, org_id)
                .where(RoadmapItem.roadmap_id == roadmap.id)
                .order_by(RoadmapItem.sequence)
            ).all()
        )
        target = next(
            (item for item in roadmap_items if item.course_id == course_id),
            None,
        )
        if target is None:
            continue

        waivers_by_item = _load_waivers_by_item(db, org_id, journey.id)
        gap_ids: list[int] = []
        for item in roadmap_items:
            if item.course_id is None or item.sequence >= target.sequence:
                continue
            enrollment = enrollment_by_course.get(item.course_id)
            is_completed = (
                enrollment is not None and enrollment[0] == EnrollmentStatus.completed
            )
            is_waived = item.id in waivers_by_item
            if not is_completed and not is_waived:
                gap_ids.append(item.id)
        return journey.id, gap_ids

    return None, []


def compute_person_roadmap_progress(
    db: Session,
    org_id: int,
    person_id: int,
    *,
    journey_id: int | None = None,
) -> PersonRoadmapProgressRead:
    person_service.get_person(db, org_id, person_id)

    journeys_stmt = (
        scoped(select(Journey), Journey, org_id)
        .where(Journey.person_id == person_id)
        .order_by(Journey.id)
    )
    journeys = list(db.scalars(journeys_stmt).all())

    department_ids = {journey.department_id for journey in journeys}
    departments_by_id: dict[int, str] = {}
    if department_ids:
        dept_stmt = scoped(select(Department), Department, org_id).where(
            Department.id.in_(department_ids)
        )
        departments_by_id = {
            department.id: department.name for department in db.scalars(dept_stmt).all()
        }

    enrollment_by_course = _load_course_enrollments(db, org_id, person_id)

    journey_progress: list[PersonJourneyProgress] = []
    for journey in journeys:
        progress = _build_journey_progress(
            db,
            org_id,
            journey,
            departments_by_id.get(journey.department_id, "—"),
            enrollment_by_course,
        )
        if progress is not None:
            journey_progress.append(progress)

    selected_journey_id: int | None = None
    if journey_id is not None:
        if any(progress.journey_id == journey_id for progress in journey_progress):
            selected_journey_id = journey_id
    elif journey_progress:
        active = next(
            (
                progress
                for progress in journey_progress
                if progress.journey_status == JourneyStatus.active
            ),
            None,
        )
        selected_journey_id = (
            active.journey_id if active is not None else journey_progress[0].journey_id
        )

    return PersonRoadmapProgressRead(
        person_id=person_id,
        journeys=journey_progress,
        selected_journey_id=selected_journey_id,
    )


def _get_person_journey(
    db: Session, org_id: int, person_id: int, journey_id: int
) -> Journey:
    person_service.get_person(db, org_id, person_id)
    stmt = scoped(select(Journey), Journey, org_id).where(
        Journey.id == journey_id,
        Journey.person_id == person_id,
    )
    journey = db.scalars(stmt).first()
    if journey is None:
        raise NotFoundError("Journey not found for this person")
    return journey


def create_journey_roadmap_waiver(
    db: Session,
    org_id: int,
    person_id: int,
    journey_id: int,
    data: JourneyRoadmapWaiverCreate,
    *,
    waived_by: int,
) -> JourneyRoadmapWaiver:
    journey = _get_person_journey(db, org_id, person_id, journey_id)
    roadmap = _resolve_roadmap(db, org_id, journey)
    if roadmap is None:
        raise ValidationError(
            "این سفر به نقشه‌راهی متصل نیست.",
            field="journey_id",
        )

    item_stmt = scoped(select(RoadmapItem), RoadmapItem, org_id).where(
        RoadmapItem.id == data.roadmap_item_id,
        RoadmapItem.roadmap_id == roadmap.id,
    )
    item = db.scalars(item_stmt).first()
    if item is None:
        raise ValidationError(
            "آیتم نقشه‌راه برای این مسیر معتبر نیست.",
            field="roadmap_item_id",
        )

    enrollment_by_course = _load_course_enrollments(db, org_id, person_id)
    if item.course_id is not None:
        enrollment = enrollment_by_course.get(item.course_id)
        if enrollment is not None and enrollment[0] in _LIVE_ENROLLMENT_STATUSES:
            raise ValidationError(
                "نمی‌توان مرحله‌ای با ثبت‌نام فعال یا تکمیل‌شده را معاف کرد.",
                field="roadmap_item_id",
            )

    waiver = JourneyRoadmapWaiver(
        journey_id=journey.id,
        roadmap_item_id=item.id,
        course_id=item.course_id,
        reason=data.reason.strip(),
        waived_by=waived_by,
        org_id=org_id,
    )
    db.add(waiver)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("این مرحله قبلاً معاف شده است") from None
    db.refresh(waiver)

    activity_service.log_activity(
        db,
        org_id,
        person_id,
        action="roadmap_step_waived",
        payload={
            "journey_id": journey.id,
            "roadmap_item_id": item.id,
            "roadmap_item_title": item.title,
            "course_id": item.course_id,
            "waiver_id": waiver.id,
            "reason": waiver.reason,
        },
        actor_id=waived_by,
    )
    return waiver


def delete_journey_roadmap_waiver(
    db: Session,
    org_id: int,
    person_id: int,
    journey_id: int,
    waiver_id: int,
    *,
    actor_id: int,
) -> None:
    _get_person_journey(db, org_id, person_id, journey_id)
    stmt = scoped(select(JourneyRoadmapWaiver), JourneyRoadmapWaiver, org_id).where(
        JourneyRoadmapWaiver.id == waiver_id,
        JourneyRoadmapWaiver.journey_id == journey_id,
    )
    waiver = db.scalars(stmt).first()
    if waiver is None:
        raise NotFoundError("Waiver not found")

    item = db.scalars(
        scoped(select(RoadmapItem), RoadmapItem, org_id).where(
            RoadmapItem.id == waiver.roadmap_item_id
        )
    ).first()

    payload = {
        "journey_id": journey_id,
        "roadmap_item_id": waiver.roadmap_item_id,
        "roadmap_item_title": item.title if item is not None else None,
        "course_id": waiver.course_id,
        "waiver_id": waiver.id,
        "reason": waiver.reason,
    }
    db.delete(waiver)
    db.commit()

    activity_service.log_activity(
        db,
        org_id,
        person_id,
        action="roadmap_step_unwaived",
        payload=payload,
        actor_id=actor_id,
    )
