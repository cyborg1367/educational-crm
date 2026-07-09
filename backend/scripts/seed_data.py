"""Seed focused demo data for org_id=1 (Programming + AI). Wipes tenant data except admin."""

from __future__ import annotations

import sys
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Register all ORM models before use.
from app.activity import model as _activity_model  # noqa: F401
from app.attendance import model as _attendance_model  # noqa: F401
from app.attendance import waiver_model as _waiver_model  # noqa: F401
from app.communication import model as _communication_model  # noqa: F401
from app.consultation import model as _consultation_model  # noqa: F401
from app.course import model as _course_model  # noqa: F401
from app.course_class import model as _course_class_model  # noqa: F401
from app.department import model as _department_model  # noqa: F401
from app.enrollment import model as _enrollment_model  # noqa: F401
from app.finance import model as _finance_model  # noqa: F401
from app.journey import model as _journey_model  # noqa: F401
from app.organization import model as _organization_model  # noqa: F401
from app.person import model as _person_model  # noqa: F401
from app.roadmap import model as _roadmap_model  # noqa: F401
from app.task import model as _task_model  # noqa: F401
from app.user import model as _user_model  # noqa: F401

from sqlalchemy import delete, func, select

from app.activity.model import Activity
from app.activity.service import log_activity
from app.attendance.model import Attendance
from app.attendance.waiver_model import JourneyRoadmapWaiver
from app.communication.model import Communication
from app.communication.enums import CommunicationChannel, CommunicationDirection
from app.consultation.enums import ConsultationOutcome
from app.consultation.model import Consultation
from app.core.db import SessionLocal
from app.course.model import Course, CoursePrerequisite
from app.course_class.enums import ClassStatus
from app.course_class.model import CourseClass
from app.department.model import Department
from app.enrollment.enums import EnrollmentStatus
from app.enrollment.model import Enrollment
from app.finance import service as finance_service
from app.finance.model import Installment, Invoice, Payment, Refund
from app.finance.schemas import InstallmentPlanItem, InvoiceCreate
from app.journey import service as journey_service
from app.journey.model import Journey
from app.organization.model import Organization
from app.person.enums import PersonStatus
from app.person.model import Person
from app.roadmap.model import Roadmap, RoadmapItem
from app.task.enums import TaskStatus, TaskType
from app.task.model import Task
from app.user.model import User

ORG_ID = 1
ADMIN_EMAIL = "admin@example.com"

DEPT_PROGRAMMING = "دپارتمان فناوری و اطلاعات"
DEPT_AI = "دپارتمان هوش مصنوعی"

# (title, department, level, price_toman, description, duration_sessions)
COURSE_SPECS: list[tuple[str, str, str, int, str, int]] = [
    (
        "مبانی برنامه‌نویسی",
        DEPT_PROGRAMMING,
        "مقدماتی",
        3_500_000,
        "منطق برنامه‌نویسی، متغیرها، حلقه‌ها و توابع — بدون پیش‌نیاز.",
        10,
    ),
    (
        "Python مقدماتی",
        DEPT_PROGRAMMING,
        "مقدماتی",
        4_800_000,
        "سینتکس Python، ساختار داده پایه و حل مسئله.",
        12,
    ),
    (
        "ساختمان داده و الگوریتم",
        DEPT_PROGRAMMING,
        "متوسط",
        5_500_000,
        "آرایه، لیست پیوندی، درخت، گراف و تحلیل پیچیدگی.",
        14,
    ),
    (
        "توسعه وب با JavaScript",
        DEPT_PROGRAMMING,
        "متوسط",
        6_200_000,
        "ES6+، DOM، async/await و مبانی React.",
        16,
    ),
    (
        "Backend با Python",
        DEPT_PROGRAMMING,
        "پیشرفته",
        7_000_000,
        "REST API، FastAPI، پایگاه‌داده و احراز هویت.",
        14,
    ),
    (
        "پروژه نهایی برنامه‌نویسی",
        DEPT_PROGRAMMING,
        "پروژه",
        4_000_000,
        "پیاده‌سازی محصول واقعی با راهنمایی منتور.",
        8,
    ),
    (
        "ریاضیات برای یادگیری ماشین",
        DEPT_AI,
        "مقدماتی",
        4_200_000,
        "جبر خطی، احتمال و آمار برای ML.",
        10,
    ),
    (
        "Python برای علم داده",
        DEPT_AI,
        "مقدماتی",
        5_000_000,
        "NumPy، Pandas، مصورسازی و پاک‌سازی داده.",
        12,
    ),
    (
        "یادگیری ماشین مقدماتی",
        DEPT_AI,
        "متوسط",
        7_500_000,
        "رگرسیون، طبقه‌بندی، خوشه‌بندی و ارزیابی مدل.",
        16,
    ),
    (
        "یادگیری عمیق",
        DEPT_AI,
        "پیشرفته",
        9_000_000,
        "شبکه عصبی، CNN، RNN و آموزش با PyTorch.",
        18,
    ),
    (
        "پردازش زبان طبیعی (NLP)",
        DEPT_AI,
        "پیشرفته",
        8_500_000,
        "توکنایزیشن، embedding، ترنسفورمر و LLM.",
        14,
    ),
    (
        "پروژه MLOps",
        DEPT_AI,
        "پروژه",
        5_500_000,
        "استقرار مدل، مانیتورینگ و pipeline تولید.",
        10,
    ),
]

# Roadmap shells only — items are synced from course prerequisite DAGs.
ROADMAP_SPECS: list[tuple[str, str]] = [
    ("مسیر کامل برنامه‌نویسی", DEPT_PROGRAMMING),
    ("مسیر هوش مصنوعی", DEPT_AI),
]

# course title -> prerequisite course titles (same department only).
# Multiple roots per department are intentional (no inbound edges):
# - Programming: «مبانی برنامه‌نویسی» and «توسعه وب با JavaScript»
# - AI: «ریاضیات برای یادگیری ماشین» and «Python برای علم داده»
COURSE_PREREQUISITES: dict[str, list[str]] = {
    "Python مقدماتی": ["مبانی برنامه‌نویسی"],
    "ساختمان داده و الگوریتم": ["Python مقدماتی"],
    "Backend با Python": ["ساختمان داده و الگوریتم"],
    "پروژه نهایی برنامه‌نویسی": ["Backend با Python", "توسعه وب با JavaScript"],
    "یادگیری ماشین مقدماتی": [
        "Python برای علم داده",
        "ریاضیات برای یادگیری ماشین",
    ],
    "یادگیری عمیق": ["یادگیری ماشین مقدماتی"],
    "پردازش زبان طبیعی (NLP)": ["یادگیری ماشین مقدماتی"],
    "پروژه MLOps": ["یادگیری عمیق", "پردازش زبان طبیعی (NLP)"],
}

# (class_name, course_title, status, start, end, weekdays)
CLASS_SPECS: list[tuple[str, str, ClassStatus, date, date, list[str]]] = [
    (
        "Python مقدماتی — بهار ۱۴۰۵",
        "Python مقدماتی",
        ClassStatus.active,
        date(2026, 3, 1),
        date(2026, 6, 1),
        ["شنبه", "دوشنبه"],
    ),
    (
        "مبانی برنامه‌نویسی — ترم جاری",
        "مبانی برنامه‌نویسی",
        ClassStatus.active,
        date(2026, 2, 15),
        date(2026, 5, 15),
        ["یکشنبه", "چهارشنبه"],
    ),
    (
        "JavaScript وب — تابستان ۱۴۰۵",
        "توسعه وب با JavaScript",
        ClassStatus.planned,
        date(2026, 7, 1),
        date(2026, 10, 1),
        ["شنبه", "سه‌شنبه"],
    ),
    (
        "Backend Python — پاییز ۱۴۰۴",
        "Backend با Python",
        ClassStatus.completed,
        date(2025, 9, 1),
        date(2025, 12, 15),
        ["دوشنبه", "چهارشنبه"],
    ),
    (
        "یادگیری ماشین — بهار ۱۴۰۵",
        "یادگیری ماشین مقدماتی",
        ClassStatus.active,
        date(2026, 3, 15),
        date(2026, 7, 15),
        ["شنبه", "دوشنبه"],
    ),
    (
        "علم داده Python — زمستان ۱۴۰۴",
        "Python برای علم داده",
        ClassStatus.completed,
        date(2025, 11, 1),
        date(2026, 2, 1),
        ["یکشنبه", "سه‌شنبه"],
    ),
    (
        "یادگیری عمیق — پاییز ۱۴۰۵",
        "یادگیری عمیق",
        ClassStatus.planned,
        date(2026, 9, 1),
        date(2027, 1, 1),
        ["دوشنبه", "پنج‌شنبه"],
    ),
]

# (full_name, phone, status, interests)
PERSON_SPECS: list[tuple[str, str, PersonStatus, list[str] | None]] = [
    ("آرین محمدی", "09121010001", PersonStatus.prospect, ["programming"]),
    ("هلیا رستمی", "09121010002", PersonStatus.prospect, ["ai"]),
    ("پویا نیکزاد", "09121010003", PersonStatus.prospect, None),
    ("سارا کاظمی", "09121010004", PersonStatus.lead, ["programming"]),
    ("امیرحسین مرادی", "09121010005", PersonStatus.lead, ["ai", "programming"]),
    ("نیلوفر جلالی", "09121010006", PersonStatus.lead, ["ai"]),
    ("رضا طاهری", "09121010007", PersonStatus.student, ["programming"]),
    ("مینا شفیعی", "09121010008", PersonStatus.student, ["programming"]),
    ("کاوه انصاری", "09121010009", PersonStatus.student, ["ai"]),
    ("الهام بحرینی", "09121010010", PersonStatus.student, ["ai"]),
    ("بابک رضوی", "09121010011", PersonStatus.student, ["programming", "ai"]),
    ("شیدا عباسی", "09121010012", PersonStatus.student, ["programming"]),
    ("مهدی یزدانی", "09121010013", PersonStatus.dormant, ["programming"]),
    ("نگار فلاح", "09121010014", PersonStatus.dormant, ["ai"]),
    ("حامد قربانی", "09121010015", PersonStatus.alumni, ["programming"]),
    ("لادن حمیدی", "09121010016", PersonStatus.alumni, ["ai"]),
    ("فرزاد امینی", "09121010017", PersonStatus.student, ["ai"]),
    ("زینب کریمی", "09121010018", PersonStatus.lead, ["programming"]),
]

# (person_name, department, outcome | None, goal, recommended_course | None, notes)
CONSULTATION_SPECS: list[
    tuple[str, str, ConsultationOutcome | None, str, str | None, str]
] = [
    ("سارا کاظمی", DEPT_PROGRAMMING, None, "یادگیری Python از صفر", "Python مقدماتی", "در انتظار ارزیابی"),
    ("امیرحسین مرادی", DEPT_AI, None, "ورود به مسیر ML", "یادگیری ماشین مقدماتی", "نیاز به بررسی پیش‌نیاز ریاضی"),
    ("نیلوفر جلالی", DEPT_AI, None, "تغییر مسیر شغلی به AI", "Python برای علم داده", "مشاوره اولیه انجام نشده"),
    ("زینب کریمی", DEPT_PROGRAMMING, None, "برنامه‌نویسی برای استارتاپ", "مبانی برنامه‌نویسی", "تماس برای تعیین وقت"),
    ("آرین محمدی", DEPT_PROGRAMMING, ConsultationOutcome.follow_up, "آشنایی با برنامه‌نویسی", None, "نیاز به تماس مجدد"),
    ("هلیا رستمی", DEPT_AI, ConsultationOutcome.follow_up, "علاقه به NLP", None, "منتظر ارسال رزومه"),
    ("پویا نیکزاد", DEPT_PROGRAMMING, ConsultationOutcome.not_suitable, "دوره خیلی فشرده", None, "زمان کافی ندارد"),
    ("رضا طاهری", DEPT_PROGRAMMING, ConsultationOutcome.pre_enroll, "توسعه‌دهنده وب", "Python مقدماتی", "آماده ثبت‌نام"),
    ("مینا شفیعی", DEPT_PROGRAMMING, ConsultationOutcome.pre_enroll, "تغییر شغل به IT", "Python مقدماتی", "ثبت‌نام در کلاس بهار"),
    ("کاوه انصاری", DEPT_AI, ConsultationOutcome.pre_enroll, "ML برای تحلیل داده", "یادگیری ماشین مقدماتی", "پیش‌نیاز Python دارد"),
    ("الهام بحرینی", DEPT_AI, ConsultationOutcome.pre_enroll, "پروژه تحقیقاتی", "یادگیری ماشین مقدماتی", "دانشجوی ارشد"),
    ("بابک رضوی", DEPT_PROGRAMMING, ConsultationOutcome.closed, "مشاوره عمومی", None, "فعلاً ثبت‌نام نمی‌کند"),
    ("امیرحسین مرادی", DEPT_PROGRAMMING, ConsultationOutcome.refer_other_dept, "علاقه به AI", None, "ارجاع به دپارتمان هوش مصنوعی"),
    ("شیدا عباسی", DEPT_PROGRAMMING, ConsultationOutcome.pre_enroll, "شروع از مبانی", "مبانی برنامه‌نویسی", "پیش‌ثبت‌نام"),
    ("فرزاد امینی", DEPT_AI, ConsultationOutcome.closed, "تکمیل مسیر علم داده", "Python برای علم داده", "دوره را تمام کرده"),
]


def _get_admin(db) -> User:
    admin = db.scalars(select(User).where(User.email == ADMIN_EMAIL)).first()
    if admin is None:
        raise RuntimeError(f"Admin user {ADMIN_EMAIL} not found — run migrations first.")
    return admin


def wipe_demo_data(db) -> None:
    """Remove all tenant data except organization and bootstrap admin."""
    print("Wiping existing demo data…")
    for model in (
        Refund,
        Payment,
        Installment,
        Invoice,
        Attendance,
        JourneyRoadmapWaiver,
        Enrollment,
        Task,
        Activity,
        Communication,
        Consultation,
        Journey,
        RoadmapItem,
        Roadmap,
        CourseClass,
        CoursePrerequisite,
        Course,
        Person,
        Department,
    ):
        db.execute(delete(model).where(model.org_id == ORG_ID))

    db.execute(delete(User).where(User.org_id == ORG_ID, User.id != 1))
    db.commit()
    print("  wiped — only admin@example.com remains")


def seed_departments(db, admin: User) -> dict[str, Department]:
    departments: dict[str, Department] = {}
    for name in (DEPT_PROGRAMMING, DEPT_AI):
        dept = Department(
            name=name,
            manager_id=admin.id,
            is_active=True,
            org_id=ORG_ID,
        )
        db.add(dept)
        db.flush()
        departments[name] = dept
        print(f"  created department {name}")
    db.commit()
    return departments


def seed_courses(db, departments: dict[str, Department]) -> dict[str, Course]:
    courses: dict[str, Course] = {}
    for title, dept_name, level, price, description, sessions in COURSE_SPECS:
        course = Course(
            department_id=departments[dept_name].id,
            title=title,
            description=description,
            level=level,
            current_price=price,
            duration_sessions=sessions,
            total_hours=sessions * 2,
            session_duration=2.0,
            sessions_per_week=2,
            is_active=True,
            org_id=ORG_ID,
        )
        db.add(course)
        db.flush()
        courses[title] = course
        print(f"  created course {title}")
    db.commit()
    return courses


def seed_course_prerequisites(db, courses: dict[str, Course]) -> None:
    created = 0
    for course_title, prerequisite_titles in COURSE_PREREQUISITES.items():
        course = courses[course_title]
        for prerequisite_title in prerequisite_titles:
            prerequisite = courses[prerequisite_title]
            if prerequisite.department_id != course.department_id:
                raise RuntimeError(
                    f"Cross-department prerequisite is not allowed: {course_title} -> {prerequisite_title}"
                )
            db.add(
                CoursePrerequisite(
                    course_id=course.id,
                    prerequisite_course_id=prerequisite.id,
                    org_id=ORG_ID,
                )
            )
            created += 1
    db.commit()
    print(f"  created {created} course prerequisites")


def seed_roadmaps(
    db,
    departments: dict[str, Department],
    courses: dict[str, Course],
) -> None:
    from app.roadmap import service as roadmap_service

    for roadmap_name, dept_name in ROADMAP_SPECS:
        roadmap = Roadmap(
            department_id=departments[dept_name].id,
            name=roadmap_name,
            is_active=True,
            org_id=ORG_ID,
        )
        db.add(roadmap)
        db.flush()
        items = roadmap_service.sync_roadmap_items_from_courses(
            db, ORG_ID, roadmap.id
        )
        print(f"  created roadmap {roadmap_name} ({len(items)} steps from courses)")
    # sync_roadmap_items_from_courses already commits per roadmap.


def assign_journey_roadmaps(db) -> None:
    """Attach each journey to its department's active roadmap for demo progress."""
    roadmaps_by_department: dict[int, int] = {}
    for roadmap in db.scalars(
        select(Roadmap).where(Roadmap.org_id == ORG_ID, Roadmap.is_active.is_(True))
    ).all():
        if roadmap.department_id not in roadmaps_by_department:
            roadmaps_by_department[roadmap.department_id] = roadmap.id

    updated = 0
    for journey in db.scalars(select(Journey).where(Journey.org_id == ORG_ID)).all():
        roadmap_id = roadmaps_by_department.get(journey.department_id)
        if roadmap_id is not None and journey.roadmap_id != roadmap_id:
            journey.roadmap_id = roadmap_id
            updated += 1
    db.commit()
    print(f"  assigned roadmaps to {updated} journeys")


def seed_roadmap_waivers(db, admin: User, people: list[Person]) -> None:
    """Demonstrate clean mid-path placement via waiver (حامد) vs open gap (فرزاد)."""
    people_by_name = {person.full_name: person for person in people}
    hamed = people_by_name["حامد قربانی"]
    journey = db.scalars(
        select(Journey).where(
            Journey.org_id == ORG_ID,
            Journey.person_id == hamed.id,
        )
    ).first()
    if journey is None or journey.roadmap_id is None:
        print("  skipped waivers — journey/roadmap missing for حامد قربانی")
        return

    enrollments = list(
        db.scalars(
            select(Enrollment).where(
                Enrollment.org_id == ORG_ID,
                Enrollment.person_id == hamed.id,
                Enrollment.status != EnrollmentStatus.dropped,
            )
        ).all()
    )
    enrolled_course_ids: set[int] = set()
    for enrollment in enrollments:
        course_class = db.get(CourseClass, enrollment.class_id)
        if course_class is not None:
            enrolled_course_ids.add(course_class.course_id)

    items = list(
        db.scalars(
            select(RoadmapItem)
            .where(
                RoadmapItem.org_id == ORG_ID,
                RoadmapItem.roadmap_id == journey.roadmap_id,
            )
            .order_by(RoadmapItem.sequence)
        ).all()
    )
    live_sequences = [
        item.sequence
        for item in items
        if item.course_id is not None and item.course_id in enrolled_course_ids
    ]
    if not live_sequences:
        print("  skipped waivers — no mid-path enrollment on roadmap for حامد")
        return

    anchor_sequence = min(live_sequences)
    created = 0
    for item in items:
        if item.course_id is None or item.sequence >= anchor_sequence:
            continue
        db.add(
            JourneyRoadmapWaiver(
                journey_id=journey.id,
                roadmap_item_id=item.id,
                course_id=item.course_id,
                reason="جایابی سطح: دانش قبلی تأیید شد (seed)",
                waived_by=admin.id,
                org_id=ORG_ID,
            )
        )
        created += 1
    db.commit()
    print(f"  created {created} roadmap waivers for حامد قربانی")
    print("  فرزاد امینی left without waivers to demo path gap")


def seed_classes(db, courses: dict[str, Course], admin: User) -> dict[str, CourseClass]:
    classes: dict[str, CourseClass] = {}
    for name, course_title, status, start, end, weekdays in CLASS_SPECS:
        course_class = CourseClass(
            course_id=courses[course_title].id,
            teacher_id=admin.id,
            name=name,
            start_date=start,
            end_date=end,
            weekdays=weekdays,
            status=status,
            org_id=ORG_ID,
        )
        db.add(course_class)
        db.flush()
        classes[name] = course_class
        print(f"  created class {name}")
    db.commit()
    return classes


def seed_people(db) -> list[Person]:
    now = datetime.now(UTC)
    people: list[Person] = []
    for index, (full_name, phone, status, interests) in enumerate(PERSON_SPECS):
        created_at = now - timedelta(days=120 - index * 5)
        person = Person(
            full_name=full_name,
            phone=phone,
            status=status,
            interests=interests,
            source="website" if index % 3 == 0 else "friend_referral",
            org_id=ORG_ID,
            created_at=created_at,
            updated_at=created_at,
        )
        db.add(person)
        db.flush()
        people.append(person)
    db.commit()
    print(f"  created {len(people)} people")
    return people


def seed_consultations(
    db,
    admin: User,
    people: list[Person],
    departments: dict[str, Department],
    courses: dict[str, Course],
) -> list[Consultation]:
    people_by_name = {p.full_name: p for p in people}
    consultations: list[Consultation] = []
    now = datetime.now(UTC)

    for index, (person_name, dept_name, outcome, goal, course_title, notes) in enumerate(
        CONSULTATION_SPECS
    ):
        person = people_by_name[person_name]
        dept = departments[dept_name]
        journey = journey_service.get_or_create_journey(db, ORG_ID, person.id, dept.id)

        refer_dept_id: int | None = None
        if outcome == ConsultationOutcome.refer_other_dept:
            other = DEPT_AI if dept_name == DEPT_PROGRAMMING else DEPT_PROGRAMMING
            refer_dept_id = departments[other].id

        created_at = now - timedelta(days=45 - index * 2)
        consultation = Consultation(
            person_id=person.id,
            department_id=dept.id,
            consultant_id=admin.id,
            journey_id=journey.id,
            current_level="مبتدی" if index % 2 == 0 else "متوسط",
            need="ارتقای مهارت فنی",
            goal=goal,
            recommended_course_id=courses[course_title].id if course_title else None,
            outcome=outcome,
            refer_to_department_id=refer_dept_id,
            notes=notes,
            org_id=ORG_ID,
            created_at=created_at,
            updated_at=created_at,
        )
        db.add(consultation)
        db.flush()
        consultations.append(consultation)

    db.commit()
    print(f"  created {len(consultations)} consultations")
    return consultations


def _consultation_for_person_dept(
    consultations: list[Consultation],
    person_id: int,
    department_id: int,
) -> Consultation | None:
    matches = [
        c
        for c in consultations
        if c.person_id == person_id
        and c.department_id == department_id
        and c.outcome == ConsultationOutcome.pre_enroll
    ]
    if matches:
        return matches[-1]
    matches = [
        c
        for c in consultations
        if c.person_id == person_id and c.department_id == department_id
    ]
    return matches[-1] if matches else None


def seed_enrollments(
    db,
    people: list[Person],
    classes: dict[str, CourseClass],
    courses: dict[str, Course],
    departments: dict[str, Department],
    consultations: list[Consultation],
) -> list[Enrollment]:
    """Enroll students across classes with varied enrollment statuses."""
    specs: list[tuple[str, str, EnrollmentStatus, int]] = [
        ("رضا طاهری", "Python مقدماتی — بهار ۱۴۰۵", EnrollmentStatus.active, 1),
        ("مینا شفیعی", "Python مقدماتی — بهار ۱۴۰۵", EnrollmentStatus.active, 2),
        ("کاوه انصاری", "یادگیری ماشین — بهار ۱۴۰۵", EnrollmentStatus.active, 2),
        ("الهام بحرینی", "یادگیری ماشین — بهار ۱۴۰۵", EnrollmentStatus.active, 3),
        ("بابک رضوی", "مبانی برنامه‌نویسی — ترم جاری", EnrollmentStatus.active, 3),
        ("شیدا عباسی", "مبانی برنامه‌نویسی — ترم جاری", EnrollmentStatus.pre_enroll, 4),
        ("فرزاد امینی", "علم داده Python — زمستان ۱۴۰۴", EnrollmentStatus.completed, 5),
        ("حامد قربانی", "Backend Python — پاییز ۱۴۰۴", EnrollmentStatus.completed, 6),
        ("لادن حمیدی", "علم داده Python — زمستان ۱۴۰۴", EnrollmentStatus.completed, 6),
        ("مهدی یزدانی", "Python مقدماتی — بهار ۱۴۰۵", EnrollmentStatus.dropped, 4),
        ("نگار فلاح", "یادگیری ماشین — بهار ۱۴۰۵", EnrollmentStatus.dropped, 5),
    ]

    people_by_name = {p.full_name: p for p in people}
    course_dept_by_id = {c.id: c.department_id for c in courses.values()}
    enrollments: list[Enrollment] = []
    now = datetime.now(UTC)

    for person_name, class_name, status, month in specs:
        person = people_by_name[person_name]
        course_class = classes[class_name]
        course = next(c for c in courses.values() if c.id == course_class.course_id)
        dept_id = course_dept_by_id[course.id]
        journey = db.scalars(
            select(Journey).where(
                Journey.org_id == ORG_ID,
                Journey.person_id == person.id,
                Journey.department_id == dept_id,
            )
        ).first()
        if journey is None:
            journey = journey_service.get_or_create_journey(db, ORG_ID, person.id, dept_id)

        consultation = _consultation_for_person_dept(consultations, person.id, dept_id)
        created_at = datetime(2026, month, 10, 10, 0, tzinfo=UTC)

        enrollment = Enrollment(
            person_id=person.id,
            class_id=course_class.id,
            consultation_id=consultation.id if consultation else None,
            journey_id=journey.id,
            status=status,
            price_snapshot=course.current_price,
            discount_snapshot=0,
            final_amount=course.current_price,
            start_date=course_class.start_date,
            org_id=ORG_ID,
            created_at=created_at,
            updated_at=created_at,
        )
        db.add(enrollment)
        db.flush()
        enrollments.append(enrollment)

    db.commit()
    print(f"  created {len(enrollments)} enrollments")
    return enrollments


def seed_invoices(db, enrollments: list[Enrollment]) -> list[Enrollment]:
    """Issue two-installment invoices for non-dropped enrollments."""
    invoiced: list[Enrollment] = []
    for index, enrollment in enumerate(enrollments):
        if enrollment.status == EnrollmentStatus.dropped:
            continue

        half = enrollment.final_amount // 2
        remainder = enrollment.final_amount - half

        if enrollment.status == EnrollmentStatus.pre_enroll:
            first_due = date(2026, 7, 15)
            second_due = date(2026, 9, 1)
        elif index % 3 == 0:
            first_due = date(2026, 5, 1)
            second_due = date(2026, 7, 1)
        else:
            first_due = date(2026, 6, 1)
            second_due = date(2026, 8, 1)

        finance_service.issue_invoice(
            db,
            ORG_ID,
            InvoiceCreate(
                enrollment_id=enrollment.id,
                installments=[
                    InstallmentPlanItem(sequence=1, amount=half, due_date=first_due),
                    InstallmentPlanItem(sequence=2, amount=remainder, due_date=second_due),
                ],
            ),
        )
        invoiced.append(enrollment)

    print(f"  created invoices for {len(invoiced)} enrollments")
    return invoiced


def seed_payments(db, admin: User, enrollments: list[Enrollment]) -> None:
    """Record payments so dashboard revenue/collection widgets have data."""
    payment_plan: list[tuple[int, int, int | None, date]] = [
        (0, 1, None, date(2026, 7, 5)),
        (0, 2, None, date(2026, 7, 6)),
        (1, 1, None, date(2026, 7, 3)),
        (2, 1, None, date(2026, 6, 20)),
        (3, 1, None, date(2026, 7, 1)),
        (4, 1, None, date(2026, 6, 15)),
        (6, 1, None, date(2026, 5, 10)),
        (6, 2, None, date(2026, 6, 1)),
        (7, 1, None, date(2026, 4, 5)),
        (7, 2, None, date(2026, 5, 5)),
        (8, 1, None, date(2026, 5, 12)),
        (8, 2, None, date(2026, 6, 12)),
    ]

    for enrollment_index, sequence, partial_amount, payment_date in payment_plan:
        if enrollment_index >= len(enrollments):
            continue
        enrollment = enrollments[enrollment_index]
        if enrollment.status == EnrollmentStatus.dropped:
            continue

        invoice = db.scalars(
            select(Invoice).where(
                Invoice.org_id == ORG_ID,
                Invoice.enrollment_id == enrollment.id,
            )
        ).first()
        if invoice is None:
            continue

        installments = finance_service.get_installments_for_invoice(db, ORG_ID, invoice.id)
        installment = next((i for i in installments if i.sequence == sequence), None)
        if installment is None or installment.paid_amount > 0:
            continue

        amount = partial_amount if partial_amount is not None else installment.amount
        if enrollment_index == 2 and sequence == 1:
            amount = installment.amount // 2

        finance_service.record_payment(
            db,
            ORG_ID,
            installment.id,
            amount,
            admin.id,
            payment_date=payment_date,
        )

    db.commit()
    print("  recorded payments")


def seed_tasks(db, admin: User, people: list[Person]) -> None:
    today = date.today()
    task_specs: list[tuple[TaskType, str, TaskStatus, str]] = [
        (TaskType.follow_up_registration, "پیگیری ثبت‌نام سارا کاظمی", TaskStatus.open, "سارا کاظمی"),
        (TaskType.follow_up_registration, "تماس مجدد هلیا رستمی", TaskStatus.open, "هلیا رستمی"),
        (TaskType.pre_enroll_unpaid, "پیش‌ثبت‌نام بدون پرداخت — شیدا عباسی", TaskStatus.open, "شیدا عباسی"),
        (TaskType.installment_overdue, "یادآوری قسط معوق", TaskStatus.open, "کاوه انصاری"),
        (TaskType.post_course_consultation, "مشاوره پس از دوره — حامد قربانی", TaskStatus.open, "حامد قربانی"),
        (TaskType.referral, "پیگیری ارجاع امیرحسین به AI", TaskStatus.open, "امیرحسین مرادی"),
        (TaskType.custom, "ارسال بروشور دوره‌های تابستان", TaskStatus.done, "زینب کریمی"),
        (TaskType.dormant_followup, "پیگیری سرنخ راکد", TaskStatus.open, "مهدی یزدانی"),
    ]

    people_by_name = {p.full_name: p for p in people}
    for index, (task_type, title, status, person_name) in enumerate(task_specs):
        person = people_by_name[person_name]
        task = Task(
            person_id=person.id,
            type=task_type,
            title=title,
            description="وظیفه نمونه برای دمو",
            due_date=today + timedelta(days=index + 1),
            assignee_id=admin.id,
            status=status,
            org_id=ORG_ID,
            completed_at=datetime.now(UTC) if status == TaskStatus.done else None,
        )
        db.add(task)
    db.commit()
    print(f"  created {len(task_specs)} tasks")


def _first_installment_for_enrollment(db, enrollment_id: int) -> Installment | None:
    invoice = db.scalars(
        select(Invoice).where(
            Invoice.org_id == ORG_ID,
            Invoice.enrollment_id == enrollment_id,
        )
    ).first()
    if invoice is None:
        return None
    return db.scalars(
        select(Installment)
        .where(Installment.org_id == ORG_ID, Installment.invoice_id == invoice.id)
        .order_by(Installment.sequence)
    ).first()


def seed_activities(
    db,
    admin: User,
    people: list[Person],
    consultations: list[Consultation],
    enrollments: list[Enrollment],
    departments: dict[str, Department],
) -> None:
    people_by_name = {p.full_name: p for p in people}
    created = 0

    for consultation in consultations:
        if consultation.outcome is None:
            if consultation.person_id == people_by_name["سارا کاظمی"].id:
                log_activity(
                    db,
                    ORG_ID,
                    consultation.person_id,
                    "consultation_assessment_saved",
                    payload={
                        "consultation_id": consultation.id,
                        "fields": ["current_level", "goal"],
                    },
                    actor_id=admin.id,
                )
                created += 1
            continue

        log_activity(
            db,
            ORG_ID,
            consultation.person_id,
            "consultation_done",
            payload={
                "consultation_id": consultation.id,
                "outcome": consultation.outcome.value,
                "goal": consultation.goal,
            },
            actor_id=admin.id,
        )
        created += 1

        if consultation.outcome == ConsultationOutcome.refer_other_dept:
            log_activity(
                db,
                ORG_ID,
                consultation.person_id,
                "consultation_referred",
                payload={
                    "consultation_id": consultation.id,
                    "department_id": consultation.refer_to_department_id,
                    "department_name": (
                        DEPT_AI
                        if consultation.refer_to_department_id
                        == departments[DEPT_AI].id
                        else DEPT_PROGRAMMING
                    ),
                },
                actor_id=admin.id,
            )
            created += 1

    for enrollment in enrollments:
        log_activity(
            db,
            ORG_ID,
            enrollment.person_id,
            "enrollment_created",
            payload={
                "enrollment_id": enrollment.id,
                "class_id": enrollment.class_id,
                "status": enrollment.status.value,
            },
            actor_id=admin.id,
        )
        created += 1

        installment = _first_installment_for_enrollment(db, enrollment.id)
        if installment is not None and installment.paid_amount > 0:
            log_activity(
                db,
                ORG_ID,
                enrollment.person_id,
                "payment_recorded",
                payload={
                    "enrollment_id": enrollment.id,
                    "installment_id": installment.id,
                    "amount": installment.paid_amount,
                    "invoice_id": installment.invoice_id,
                },
                actor_id=admin.id,
            )
            created += 1

    completed = next(
        (e for e in enrollments if e.status == EnrollmentStatus.completed),
        None,
    )
    if completed:
        log_activity(
            db,
            ORG_ID,
            completed.person_id,
            "course_completed",
            payload={
                "enrollment_id": completed.id,
                "class_id": completed.class_id,
            },
            actor_id=admin.id,
        )
        created += 1

    dropped = next((e for e in enrollments if e.status == EnrollmentStatus.dropped), None)
    if dropped:
        log_activity(
            db,
            ORG_ID,
            dropped.person_id,
            "enrollment_dropped",
            payload={
                "enrollment_id": dropped.id,
                "reason": "عدم پرداخت به موقع",
            },
            actor_id=admin.id,
        )
        created += 1

    demo_person = people[6]
    log_activity(
        db,
        ORG_ID,
        demo_person.id,
        "manual_note",
        payload={"note": "علاقه‌مند به کلاس عصر — پیگیری هفته آینده"},
        actor_id=admin.id,
    )
    created += 1

    print(f"  created {created} activities")


def seed_communications(db, people: list[Person]) -> None:
    people_by_name = {p.full_name: p for p in people}
    specs: list[tuple[str, CommunicationChannel, CommunicationDirection, str]] = [
        ("رضا طاهری", CommunicationChannel.phone, CommunicationDirection.outbound, "تأیید زمان کلاس Python و پرداخت قسط اول."),
        ("سارا کاظمی", CommunicationChannel.sms, CommunicationDirection.outbound, "یادآوری جلسه مشاوره فردا ساعت ۱۰."),
        ("مینا شفیعی", CommunicationChannel.email, CommunicationDirection.inbound, "درخواست تغییر شیفت کلاس به عصر."),
        ("کاوه انصاری", CommunicationChannel.phone, CommunicationDirection.inbound, "پرسش درباره پیش‌نیاز یادگیری ماشین."),
        ("امیرحسین مرادی", CommunicationChannel.in_person, CommunicationDirection.outbound, "ارجاع حضوری به دپارتمان AI."),
        ("شیدا عباسی", CommunicationChannel.chat, CommunicationDirection.inbound, "سؤال درباره پیش‌پرداخت پیش‌ثبت‌نام."),
        ("هلیا رستمی", CommunicationChannel.phone, CommunicationDirection.outbound, "پیگیری مدارک مشاوره."),
        ("حامد قربانی", CommunicationChannel.email, CommunicationDirection.outbound, "دعوت به مشاوره پس از دوره."),
    ]

    for person_name, channel, direction, content in specs:
        person = people_by_name[person_name]
        db.add(
            Communication(
                person_id=person.id,
                channel=channel,
                direction=direction,
                content=content,
                metadata_=None,
                org_id=ORG_ID,
            )
        )
    db.commit()
    print(f"  created {len(specs)} communications")


def seed_attendances(db, enrollments: list[Enrollment]) -> None:
    python_enrollments = enrollments[:2]
    session_dates = [
        date(2026, 3, 8),
        date(2026, 3, 15),
        date(2026, 3, 22),
        date(2026, 4, 5),
    ]
    present_pattern = [
        [True, True, False, True],
        [True, False, True, True],
    ]

    count = 0
    for enrollment_index, enrollment in enumerate(python_enrollments):
        for session_index, session_date in enumerate(session_dates):
            db.add(
                Attendance(
                    enrollment_id=enrollment.id,
                    session_date=session_date,
                    present=present_pattern[enrollment_index][session_index],
                    org_id=ORG_ID,
                )
            )
            count += 1
    db.commit()
    print(f"  created {count} attendances")


def seed_dropped_invoices(db, enrollments: list[Enrollment]) -> None:
    """Issue then cancel invoices for dropped enrollments (timeline realism)."""
    for enrollment in enrollments:
        if enrollment.status != EnrollmentStatus.dropped:
            continue
        half = enrollment.final_amount // 2
        remainder = enrollment.final_amount - half
        finance_service.issue_invoice(
            db,
            ORG_ID,
            InvoiceCreate(
                enrollment_id=enrollment.id,
                installments=[
                    InstallmentPlanItem(sequence=1, amount=half, due_date=date(2026, 4, 1)),
                    InstallmentPlanItem(sequence=2, amount=remainder, due_date=date(2026, 6, 1)),
                ],
            ),
        )
        finance_service.cancel_installments_on_drop(db, ORG_ID, enrollment.id)
    print("  handled dropped-enrollment invoices")


def main() -> None:
    db = SessionLocal()
    try:
        org = db.get(Organization, ORG_ID)
        if org is None:
            print(f"Organization id={ORG_ID} not found. Run migrations first.")
            return

        admin = _get_admin(db)
        wipe_demo_data(db)

        print("Seeding departments…")
        departments = seed_departments(db, admin)

        print("Seeding courses…")
        courses = seed_courses(db, departments)
        print("Seeding course prerequisites…")
        seed_course_prerequisites(db, courses)

        print("Seeding roadmaps (prerequisites)…")
        seed_roadmaps(db, departments, courses)

        print("Seeding classes…")
        classes = seed_classes(db, courses, admin)

        print("Seeding people…")
        people = seed_people(db)

        print("Seeding consultations…")
        consultations = seed_consultations(db, admin, people, departments, courses)

        print("Seeding enrollments…")
        enrollments = seed_enrollments(
            db, people, classes, courses, departments, consultations
        )

        print("Assigning journey roadmaps…")
        assign_journey_roadmaps(db)

        print("Seeding roadmap waivers (placement)…")
        seed_roadmap_waivers(db, admin, people)

        print("Seeding invoices…")
        seed_invoices(db, enrollments)

        print("Seeding dropped-enrollment invoices…")
        seed_dropped_invoices(db, enrollments)

        print("Seeding payments…")
        seed_payments(db, admin, enrollments)

        print("Seeding tasks…")
        seed_tasks(db, admin, people)

        print("Seeding activities…")
        seed_activities(db, admin, people, consultations, enrollments, departments)

        print("Seeding communications…")
        seed_communications(db, people)

        print("Seeding attendances…")
        seed_attendances(db, enrollments)

        pending = sum(1 for c in consultations if c.outcome is None)
        invoice_count = db.scalar(
            select(func.count()).select_from(Invoice).where(Invoice.org_id == ORG_ID)
        )
        activity_count = db.scalar(
            select(func.count()).select_from(Activity).where(Activity.org_id == ORG_ID)
        )

        print("Done.")
        print(f"  Login: {ADMIN_EMAIL} / changeme123")
        print(f"  Departments: {DEPT_PROGRAMMING}, {DEPT_AI}")
        print(
            f"  Courses: {len(courses)}, Classes: {len(classes)}, People: {len(people)}"
        )
        print(
            f"  Consultations: {len(consultations)} ({pending} pending), "
            f"Enrollments: {len(enrollments)}, Invoices: {invoice_count}, "
            f"Activities: {activity_count}"
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
