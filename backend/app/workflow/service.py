from datetime import date, timedelta

from app.core.errors import ValidationError
from app.core.logging_config import get_logger
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.activity import service as activity_service
from app.activity.model import Activity
from app.consultation import service as consultation_service
from app.consultation.enums import ConsultationOutcome
from app.consultation.model import Consultation
from app.course import service as course_service
from app.course_class import service as class_service
from app.course_class.enums import ClassStatus
from app.course_class.model import CourseClass
from app.department import service as department_service
from app.enrollment import service as enrollment_service
from app.enrollment.enums import EnrollmentStatus
from app.enrollment.model import Enrollment
from app.enrollment.schemas import EnrollmentCreate
from app.finance import service as finance_service
from app.finance.schemas import InstallmentPlanItem, InvoiceCreate
from app.journey import service as journey_service
from app.journey.enums import JourneyStatus
from app.journey.model import Journey
from app.notifications import service as notifications_service
from app.person import service as person_service
from app.person.enums import PersonStatus
from app.task import service as task_service
from app.task.enums import TaskStatus, TaskType
from app.task.model import Task
from app.tenancy.scoping import scoped
from app.user.enums import UserRole
from app.user.model import User

logger = get_logger(__name__)


def _resolve_referring_admission_officer(
    db: Session, org_id: int, consultation: Consultation
) -> int:
    stmt = (
        scoped(select(Activity), Activity, org_id)
        .where(
            Activity.person_id == consultation.person_id,
            Activity.action == "consultation_referred",
        )
        .order_by(Activity.created_at.desc())
    )
    for activity in db.scalars(stmt).all():
        payload = activity.payload or {}
        if payload.get("department_id") == consultation.department_id:
            if activity.actor_id is not None:
                return activity.actor_id
    return _resolve_admission_assignee(db, org_id)


def _resolve_admission_assignee(db: Session, org_id: int) -> int:
    stmt = (
        scoped(select(User), User, org_id)
        .where(User.role == UserRole.admission, User.is_active.is_(True))
        .order_by(User.id)
        .limit(1)
    )
    user = db.scalars(stmt).first()
    if user is None:
        raise ValidationError(
            "No active admission user found for follow-up task",
            field="outcome",
        )
    return user.id


def _find_open_class(
    db: Session, org_id: int, course_id: int
) -> CourseClass | None:
    stmt = (
        scoped(select(CourseClass), CourseClass, org_id)
        .where(
            CourseClass.course_id == course_id,
            CourseClass.status.in_([ClassStatus.planned, ClassStatus.active]),
        )
        .order_by(CourseClass.start_date)
        .limit(1)
    )
    return db.scalars(stmt).first()


def _ensure_journey_and_lead(
    db: Session, org_id: int, consultation: Consultation
) -> Journey:
    journey = journey_service.get_or_create_journey(
        db, org_id, consultation.person_id, consultation.department_id
    )
    if consultation.journey_id is None:
        consultation.journey_id = journey.id
        db.flush()

    person = person_service.get_person(db, org_id, consultation.person_id)
    if person.status == PersonStatus.prospect:
        person.status = PersonStatus.lead
        db.flush()

    return journey


def _route_pre_enroll(
    db: Session,
    org_id: int,
    consultation: Consultation,
    journey: Journey,
    *,
    class_id: int | None,
    actor_id: int | None,
) -> None:
    resolved_class_id = class_id
    if resolved_class_id is None:
        if consultation.recommended_course_id is None:
            raise ValidationError(
                "recommended_course_id or class_id required for pre_enroll",
                field="class_id",
            )
        open_class = _find_open_class(
            db, org_id, consultation.recommended_course_id
        )
        if open_class is None:
            raise ValidationError(
                "No open class found for the recommended course",
                field="class_id",
            )
        resolved_class_id = open_class.id
    else:
        class_service.get_class(db, org_id, resolved_class_id)

    enrollment = enrollment_service.create_enrollment(
        db,
        org_id,
        EnrollmentCreate(
            person_id=consultation.person_id,
            class_id=resolved_class_id,
            consultation_id=consultation.id,
            journey_id=journey.id,
            status=EnrollmentStatus.pre_enroll,
        ),
    )
    on_enrollment_created(db, org_id, enrollment.id, actor_id=actor_id)

    total = enrollment.final_amount
    first_amount = total // 2
    second_amount = total - first_amount
    today = date.today()
    finance_service.issue_invoice(
        db,
        org_id,
        InvoiceCreate(
            enrollment_id=enrollment.id,
            installments=[
                InstallmentPlanItem(
                    sequence=1, amount=first_amount, due_date=today
                ),
                InstallmentPlanItem(
                    sequence=2,
                    amount=second_amount,
                    due_date=today + timedelta(days=30),
                ),
            ],
        ),
    )


def _notify_admission_feedback_pre_enroll(
    db: Session,
    org_id: int,
    consultation: Consultation,
    *,
    actor_id: int | None,
) -> None:
    person = person_service.get_person(db, org_id, consultation.person_id)
    assignee_id = _resolve_referring_admission_officer(db, org_id, consultation)
    task_service.create_task(
        db,
        org_id,
        person_id=consultation.person_id,
        task_type=TaskType.follow_up_registration,
        title=f"پیگیری ثبت‌نام {person.full_name}",
        due_date=date.today() + timedelta(days=2),
        assignee_id=assignee_id,
        description=consultation.notes,
        related_entity_type="consultation",
        related_entity_id=consultation.id,
        actor_id=actor_id,
    )


def _notify_admission_feedback_follow_up(
    db: Session,
    org_id: int,
    consultation: Consultation,
    *,
    actor_id: int | None,
) -> None:
    person = person_service.get_person(db, org_id, consultation.person_id)
    assignee_id = _resolve_referring_admission_officer(db, org_id, consultation)
    task_service.create_task(
        db,
        org_id,
        person_id=consultation.person_id,
        task_type=TaskType.consultation_follow_up,
        title=f"پیگیری مجدد با {person.full_name}",
        due_date=date.today() + timedelta(days=3),
        assignee_id=assignee_id,
        description=consultation.notes,
        related_entity_type="consultation",
        related_entity_id=consultation.id,
        actor_id=actor_id,
    )


def _log_consultation_closed(
    db: Session,
    org_id: int,
    consultation: Consultation,
    outcome: ConsultationOutcome,
    *,
    actor_id: int | None,
) -> None:
    activity_service.log_activity(
        db,
        org_id,
        consultation.person_id,
        "consultation_closed",
        payload={
            "outcome": outcome.value,
            "department_id": consultation.department_id,
            "consultant_id": consultation.consultant_id,
            "notes": consultation.notes,
        },
        actor_id=actor_id,
    )


def _notify_admission_refer_other_dept_feedback(
    db: Session,
    org_id: int,
    consultation: Consultation,
    *,
    actor_id: int | None,
) -> None:
    if consultation.refer_to_department_id is None:
        return
    person = person_service.get_person(db, org_id, consultation.person_id)
    target_dept = department_service.get_department(
        db, org_id, consultation.refer_to_department_id
    )
    assignee_id = _resolve_referring_admission_officer(db, org_id, consultation)
    task_service.create_task(
        db,
        org_id,
        person_id=consultation.person_id,
        task_type=TaskType.referral,
        title=f"ارجاع {person.full_name} به دپارتمان دیگر",
        due_date=date.today() + timedelta(days=2),
        assignee_id=assignee_id,
        description=f"ارجاع به دپارتمان {target_dept.name}",
        actor_id=actor_id,
    )


def _complete_consultation_tasks(
    db: Session, org_id: int, consultation_id: int
) -> None:
    stmt = scoped(select(Task), Task, org_id).where(
        Task.related_entity_type == "consultation",
        Task.related_entity_id == consultation_id,
        Task.status == TaskStatus.open,
    )
    for task in db.scalars(stmt).all():
        task.status = TaskStatus.done
    db.flush()


def on_consultation_created(
    db: Session,
    org_id: int,
    consultation_id: int,
    *,
    actor_id: int | None = None,
) -> Consultation:
    consultation = consultation_service.get_consultation(
        db, org_id, consultation_id
    )
    _ensure_journey_and_lead(db, org_id, consultation)

    if consultation.outcome is None:
        department = department_service.get_department(
            db, org_id, consultation.department_id
        )
        task_service.create_task(
            db,
            org_id,
            person_id=consultation.person_id,
            task_type=TaskType.custom,
            title=f"مشاوره در انتظار — {department.name}",
            due_date=date.today() + timedelta(days=3),
            assignee_id=consultation.consultant_id,
            related_entity_type="consultation",
            related_entity_id=consultation.id,
            actor_id=actor_id,
        )

    db.commit()
    db.refresh(consultation)
    return consultation


def _route_refer_other_dept(
    db: Session,
    org_id: int,
    consultation: Consultation,
    *,
    actor_id: int | None,
) -> None:
    if consultation.refer_to_department_id is None:
        raise ValidationError(
            "refer_to_department_id required for refer_other_dept",
            field="refer_to_department_id",
        )

    journey_service.get_or_create_journey(
        db,
        org_id,
        consultation.person_id,
        consultation.refer_to_department_id,
    )
    target_dept = department_service.get_department(
        db, org_id, consultation.refer_to_department_id
    )
    task_service.create_task(
        db,
        org_id,
        person_id=consultation.person_id,
        task_type=TaskType.referral,
        title=f"Referral to {target_dept.name}",
        due_date=date.today() + timedelta(days=3),
        assignee_id=target_dept.manager_id,
        related_entity_type="consultation",
        related_entity_id=consultation.id,
        actor_id=actor_id,
    )


def on_consultation_outcome(
    db: Session,
    org_id: int,
    consultation_id: int,
    new_outcome: ConsultationOutcome,
    *,
    class_id: int | None = None,
    notes: str | None = None,
    actor_id: int | None = None,
    actor: User | None = None,
) -> Consultation:
    consultation = consultation_service.get_consultation(
        db, org_id, consultation_id
    )
    if actor is not None:
        consultation_service.assert_can_modify_consultation(consultation, actor)
    if notes is not None:
        consultation.notes = notes
    previous_outcome = consultation.outcome
    consultation.outcome = new_outcome
    db.flush()

    _complete_consultation_tasks(db, org_id, consultation_id)

    journey = _ensure_journey_and_lead(db, org_id, consultation)

    if new_outcome == ConsultationOutcome.pre_enroll:
        if class_id is not None:
            _route_pre_enroll(
                db,
                org_id,
                consultation,
                journey,
                class_id=class_id,
                actor_id=actor_id,
            )
        _notify_admission_feedback_pre_enroll(
            db, org_id, consultation, actor_id=actor_id
        )
    elif new_outcome == ConsultationOutcome.follow_up:
        _notify_admission_feedback_follow_up(
            db, org_id, consultation, actor_id=actor_id
        )
    elif new_outcome == ConsultationOutcome.refer_other_dept:
        _route_refer_other_dept(db, org_id, consultation, actor_id=actor_id)
        _notify_admission_refer_other_dept_feedback(
            db, org_id, consultation, actor_id=actor_id
        )
    elif new_outcome in (
        ConsultationOutcome.not_suitable,
        ConsultationOutcome.closed,
    ):
        journey.status = JourneyStatus.completed
        db.flush()
        _log_consultation_closed(
            db, org_id, consultation, new_outcome, actor_id=actor_id
        )
    elif new_outcome == ConsultationOutcome.continue_:
        pass

    activity_service.log_activity(
        db,
        org_id,
        consultation.person_id,
        "consultation_done",
        payload={
            "consultation_id": consultation.id,
            "outcome": new_outcome.value,
            "previous_outcome": (
                previous_outcome.value if previous_outcome is not None else None
            ),
            "current_level": consultation.current_level,
            "goal": consultation.goal,
            "recommended_course_id": consultation.recommended_course_id,
            "recommended_course_name": (
                course_service.get_course(
                    db, org_id, consultation.recommended_course_id
                ).title
                if consultation.recommended_course_id is not None
                else None
            ),
        },
        actor_id=actor_id,
    )
    logger.info(
        "consultation_routed",
        extra={
            "event": "consultation_routing",
            "consultation_id": consultation.id,
            "outcome": new_outcome.value,
        },
    )
    db.commit()
    db.refresh(consultation)
    return consultation


def on_enrollment_created(
    db: Session,
    org_id: int,
    enrollment_id: int,
    *,
    actor_id: int | None = None,
    skip_timeline_log: bool = False,
) -> None:
    enrollment = enrollment_service.get_enrollment(db, org_id, enrollment_id)
    if not skip_timeline_log:
        activity_service.log_activity(
            db,
            org_id,
            enrollment.person_id,
            "enrollment_created",
            payload={
                "channel": "enrollment",
                "action": "created",
                "enrollment_id": enrollment_id,
                "status": enrollment.status.value,
            },
            actor_id=actor_id,
        )
    notifications_service.notify_payment_recorded(
        db, org_id, enrollment.person_id, enrollment.final_amount
    )
    db.commit()


def on_first_payment(
    db: Session,
    org_id: int,
    enrollment_id: int,
    *,
    actor_id: int | None = None,
    skip_activity: bool = False,
) -> None:
    enrollment = enrollment_service.get_enrollment(db, org_id, enrollment_id)
    person = person_service.get_person(db, org_id, enrollment.person_id)

    activated = False
    if enrollment.status == EnrollmentStatus.pre_enroll:
        enrollment.status = EnrollmentStatus.active
        activated = True

    if person.status == PersonStatus.lead:
        person.status = PersonStatus.student

    if activated and not skip_activity:
        activity_service.log_activity(
            db,
            org_id,
            enrollment.person_id,
            "enrollment_activated",
            payload={
                "enrollment_id": enrollment_id,
                "status": EnrollmentStatus.active.value,
            },
            actor_id=actor_id,
        )

    db.commit()


def on_class_completed(
    db: Session,
    org_id: int,
    class_id: int,
    *,
    actor_id: int | None = None,
) -> None:
    course_class = class_service.get_class(db, org_id, class_id)
    course = course_service.get_course(db, org_id, course_class.course_id)
    department = department_service.get_department(
        db, org_id, course.department_id
    )

    stmt = scoped(select(Enrollment), Enrollment, org_id).where(
        Enrollment.class_id == class_id,
        Enrollment.status.not_in(
            [EnrollmentStatus.dropped, EnrollmentStatus.completed]
        ),
    )
    enrollments = list(db.scalars(stmt).all())

    for enrollment in enrollments:
        enrollment.status = EnrollmentStatus.completed
    db.flush()

    due_date = date.today() + timedelta(days=3)
    for enrollment in enrollments:
        task_service.create_task(
            db,
            org_id,
            person_id=enrollment.person_id,
            task_type=TaskType.post_course_consultation,
            title="Post-course consultation",
            due_date=due_date,
            assignee_id=department.manager_id,
            related_entity_type="enrollment",
            related_entity_id=enrollment.id,
            actor_id=actor_id,
        )
        activity_service.log_activity(
            db,
            org_id,
            enrollment.person_id,
            "course_completed",
            payload={
                "class_id": class_id,
                "enrollment_id": enrollment.id,
            },
            actor_id=actor_id,
        )

    db.commit()
