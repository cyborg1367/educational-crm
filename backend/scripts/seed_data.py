"""Seed realistic test data for org_id=1. Idempotent — skips existing records."""

from __future__ import annotations

import sys
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Register all ORM models before use.
from app.activity import model as _activity_model  # noqa: F401
from app.attendance import model as _attendance_model  # noqa: F401
from app.communication import model as _communication_model  # noqa: F401
from app.consultation import model as _consultation_model  # noqa: F401
from app.course import model as _course_model  # noqa: F401
from app.course_class import model as _course_class_model  # noqa: F401
from app.department import model as _department_model  # noqa: F401
from app.enrollment import model as _enrollment_model  # noqa: F401
from app.finance import model as _finance_model  # noqa: F401
from app.journey import model as _journey_model  # noqa: F401
from app.journey import service as journey_service
from app.journey.model import Journey
from app.organization import model as _organization_model  # noqa: F401
from app.person import model as _person_model  # noqa: F401
from app.roadmap import model as _roadmap_model  # noqa: F401
from app.task import model as _task_model  # noqa: F401
from app.user import model as _user_model  # noqa: F401

from sqlalchemy import delete, func, select

from app.activity.model import Activity
from app.activity.service import log_activity
from app.attendance.model import Attendance
from app.auth.security import hash_password
from app.consultation.enums import ConsultationOutcome
from app.consultation.model import Consultation
from app.core.db import SessionLocal
from app.course.model import Course
from app.course_class.enums import ClassStatus
from app.course_class.model import CourseClass
from app.department.model import Department
from app.enrollment.enums import EnrollmentStatus
from app.enrollment.model import Enrollment
from app.finance import service as finance_service
from app.finance.schemas import InstallmentPlanItem, InvoiceCreate
from app.organization.model import Organization
from app.person.enums import PersonStatus
from app.person.model import Person
from app.task.enums import TaskStatus, TaskType
from app.task.model import Task
from app.user.enums import UserRole
from app.user.model import User

ORG_ID = 1
SEED_MARKER_EMAIL = "manager@crm.local"

USER_SPECS = [
    ("admin@crm.local", "Admin1234!", UserRole.admin, "مدیر سیستم", None),
    ("admission@crm.local", "Admission1234!", UserRole.admission, "کارشناس پذیرش", None),
    ("finance@crm.local", "Finance1234!", UserRole.finance, "کارشناس مالی", None),
    ("teacher@crm.local", "Teacher1234!", UserRole.teacher, "استاد احمدی", "دپارتمان فناوری و اطلاعات"),
    ("manager@crm.local", "Manager1234!", UserRole.department_manager, "مدیر دپارتمان", "دپارتمان فناوری و اطلاعات"),
]

DEPARTMENT_SPECS = [
    ("دپارتمان فناوری و اطلاعات", "admin"),
    ("دپارتمان هوش مصنوعی", "admin"),
    ("دپارتمان زبان کودکان", "admin"),
    ("دپارتمان زبان بزرگسال", "admin"),
    ("دپارتمان علوم مالی", "admin"),
]

COURSE_SPECS = [
    ("Python مقدماتی", "دپارتمان فناوری و اطلاعات", 4_500_000),
    ("JavaScript پیشرفته", "دپارتمان فناوری و اطلاعات", 5_500_000),
    ("IELTS آمادگی", "دپارتمان زبان بزرگسال", 8_000_000),
    ("TOEFL آمادگی", "دپارتمان زبان بزرگسال", 7_500_000),
    ("UI/UX مقدماتی", "دپارتمان فناوری و اطلاعات", 6_000_000),
    ("Figma پیشرفته", "دپارتمان فناوری و اطلاعات", 5_000_000),
]

CLASS_SPECS = [
    ("Python 101", "Python", "teacher", ClassStatus.active, date(2026, 1, 1), date(2026, 4, 1)),
    ("Python 102", "Python", "teacher", ClassStatus.completed, date(2025, 9, 1), date(2025, 12, 1)),
    ("IELTS Intensive", "IELTS", "teacher", ClassStatus.active, date(2026, 2, 1), date(2026, 5, 1)),
    ("UI/UX Bootcamp", "UI/UX", "teacher", ClassStatus.planned, date(2026, 8, 1), date(2026, 11, 1)),
]

PERSON_SPECS: list[tuple[str, str, PersonStatus]] = [
    ("علی رضایی", "09121000001", PersonStatus.prospect),
    ("مریم حسینی", "09121000002", PersonStatus.prospect),
    ("رضا کریمی", "09121000003", PersonStatus.prospect),
    ("زهرا محمدی", "09121000004", PersonStatus.prospect),
    ("حسین نوری", "09121000005", PersonStatus.prospect),
    ("فاطمه اکبری", "09121000006", PersonStatus.lead),
    ("امیر جعفری", "09121000007", PersonStatus.lead),
    ("سارا موسوی", "09121000008", PersonStatus.lead),
    ("مهدی قاسمی", "09121000009", PersonStatus.lead),
    ("نرگس صادقی", "09121000010", PersonStatus.lead),
    ("پریسا حیدری", "09121000011", PersonStatus.student),
    ("کامران شریفی", "09121000012", PersonStatus.student),
    ("لیلا باقری", "09121000013", PersonStatus.student),
    ("دانیال فرهادی", "09121000014", PersonStatus.student),
    ("الهام رحیمی", "09121000015", PersonStatus.student),
    ("بهرام نظری", "09121000016", PersonStatus.student),
    ("شیما توکلی", "09121000017", PersonStatus.student),
    ("آرمان پورمحمدی", "09121000018", PersonStatus.dormant),
    ("نگین زارعی", "09121000019", PersonStatus.dormant),
    ("سعید منصوری", "09121000020", PersonStatus.alumni),
]

CONSULTATION_OUTCOMES: list[ConsultationOutcome | None] = [
    ConsultationOutcome.pre_enroll,
    ConsultationOutcome.pre_enroll,
    ConsultationOutcome.pre_enroll,
    ConsultationOutcome.pre_enroll,
    ConsultationOutcome.pre_enroll,
    ConsultationOutcome.follow_up,
    ConsultationOutcome.follow_up,
    ConsultationOutcome.follow_up,
    ConsultationOutcome.refer_other_dept,
    ConsultationOutcome.refer_other_dept,
    ConsultationOutcome.not_suitable,
    ConsultationOutcome.not_suitable,
    ConsultationOutcome.closed,
    ConsultationOutcome.closed,
    None,
]


def _get_user_by_email(db, email: str) -> User | None:
    return db.scalars(select(User).where(User.email == email)).first()


def _get_user_by_role_key(db, role_key: str) -> User:
    mapping = {
        "admin": "admin@crm.local",
        "admission": "admission@crm.local",
        "finance": "finance@crm.local",
        "teacher": "teacher@crm.local",
        "manager": "manager@crm.local",
    }
    email = mapping[role_key]
    user = _get_user_by_email(db, email)
    if user is None:
        raise RuntimeError(f"Expected seed user {email} to exist")
    return user


def _already_seeded(db) -> bool:
    return _get_user_by_email(db, SEED_MARKER_EMAIL) is not None


def seed_users(db) -> dict[str, User]:
    users: dict[str, User] = {}
    for email, password, role, name, _dept_name in USER_SPECS:
        existing = _get_user_by_email(db, email)
        if existing:
            users[email] = existing
            print(f"  skip user {email}")
            continue
        user = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role=role,
            department_id=None,
            is_active=True,
            org_id=ORG_ID,
        )
        db.add(user)
        db.flush()
        users[email] = user
        print(f"  created user {email}")
    db.commit()
    return users


def seed_departments(db) -> dict[str, Department]:
    admin = _get_user_by_role_key(db, "admin")
    departments: dict[str, Department] = {}
    for name, manager_key in DEPARTMENT_SPECS:
        existing = db.scalars(
            select(Department).where(Department.org_id == ORG_ID, Department.name == name)
        ).first()
        if existing:
            departments[name] = existing
            print(f"  skip department {name}")
            continue
        manager = _get_user_by_role_key(db, manager_key)
        dept = Department(
            name=name,
            manager_id=manager.id,
            is_active=True,
            org_id=ORG_ID,
        )
        db.add(dept)
        db.flush()
        departments[name] = dept
        print(f"  created department {name}")
    db.commit()

    tech_dept = departments.get("دپارتمان فناوری و اطلاعات") or db.scalars(
        select(Department).where(
            Department.org_id == ORG_ID,
            Department.name == "دپارتمان فناوری و اطلاعات",
        )
    ).one()
    for email in ("teacher@crm.local", "manager@crm.local"):
        user = _get_user_by_email(db, email)
        if user and user.department_id != tech_dept.id:
            user.department_id = tech_dept.id
    db.commit()
    return departments


def seed_courses(db, departments: dict[str, Department]) -> dict[str, Course]:
    courses: dict[str, Course] = {}
    for title, dept_name, price in COURSE_SPECS:
        existing = db.scalars(
            select(Course).where(Course.org_id == ORG_ID, Course.title == title)
        ).first()
        if existing:
            courses[title] = existing
            print(f"  skip course {title}")
            continue
        dept = departments.get(dept_name) or db.scalars(
            select(Department).where(Department.org_id == ORG_ID, Department.name == dept_name)
        ).one()
        course = Course(
            department_id=dept.id,
            title=title,
            current_price=price,
            duration_sessions=12,
            is_active=True,
            org_id=ORG_ID,
        )
        db.add(course)
        db.flush()
        courses[title] = course
        print(f"  created course {title}")
    db.commit()
    return courses


def _course_key_match(title: str, key: str) -> bool:
    return title.startswith(key) or key in title


def seed_classes(db, courses: dict[str, Course]) -> dict[str, CourseClass]:
    classes: dict[str, CourseClass] = {}
    course_by_key: dict[str, Course] = {}
    for title, course in courses.items():
        for key in ("Python", "IELTS", "UI/UX"):
            if _course_key_match(title, key):
                course_by_key[key] = course

    for name, course_key, teacher_key, status, start, end in CLASS_SPECS:
        existing = db.scalars(
            select(CourseClass).where(CourseClass.org_id == ORG_ID, CourseClass.name == name)
        ).first()
        if existing:
            classes[name] = existing
            print(f"  skip class {name}")
            continue
        course = course_by_key.get(course_key)
        if course is None:
            for title, c in courses.items():
                if _course_key_match(title, course_key):
                    course = c
                    break
        if course is None:
            raise RuntimeError(f"No course matching key {course_key}")
        teacher = _get_user_by_role_key(db, teacher_key)
        course_class = CourseClass(
            course_id=course.id,
            teacher_id=teacher.id,
            name=name,
            start_date=start,
            end_date=end,
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
    existing_count = db.scalar(
        select(func.count()).select_from(Person).where(Person.org_id == ORG_ID)
    )
    if existing_count and existing_count >= len(PERSON_SPECS):
        people = list(
            db.scalars(
                select(Person).where(Person.org_id == ORG_ID).order_by(Person.id).limit(len(PERSON_SPECS))
            ).all()
        )
        print(f"  skip people ({len(people)} already exist)")
        return people

    now = datetime.now(UTC)
    people: list[Person] = []
    created = 0
    for index, (full_name, phone, status) in enumerate(PERSON_SPECS):
        existing = db.scalars(
            select(Person).where(Person.org_id == ORG_ID, Person.phone == phone)
        ).first()
        if existing:
            people.append(existing)
            continue
        created_at = now - timedelta(days=180 - index * 9)
        person = Person(
            full_name=full_name,
            phone=phone,
            status=status,
            source="وب‌سایت" if index % 2 == 0 else "معرفی",
            org_id=ORG_ID,
            created_at=created_at,
            updated_at=created_at,
        )
        db.add(person)
        db.flush()
        people.append(person)
        created += 1
    db.commit()
    if created:
        print(f"  created {created} people")
    elif people:
        print(f"  skip people ({len(people)} already exist)")
    return people


def seed_consultations(db, people: list[Person], departments: dict[str, Department]) -> list[Consultation]:
    existing_count = db.scalar(
        select(func.count()).select_from(Consultation).where(Consultation.org_id == ORG_ID)
    )
    if existing_count and existing_count >= len(CONSULTATION_OUTCOMES):
        return list(
            db.scalars(
                select(Consultation)
                .where(Consultation.org_id == ORG_ID)
                .order_by(Consultation.id)
                .limit(len(CONSULTATION_OUTCOMES))
            ).all()
        )

    admission = _get_user_by_role_key(db, "admission")
    dept_names = list(departments.keys()) or [
        "دپارتمان فناوری و اطلاعات",
        "دپارتمان هوش مصنوعی",
        "دپارتمان زبان بزرگسال",
    ]
    consultations: list[Consultation] = []
    for index, outcome in enumerate(CONSULTATION_OUTCOMES):
        person = people[index % len(people)]
        dept_name = dept_names[index % len(dept_names)]
        dept = departments.get(dept_name) or db.scalars(
            select(Department).where(Department.org_id == ORG_ID, Department.name == dept_name)
        ).one()
        refer_dept_id: int | None = None
        if outcome == ConsultationOutcome.refer_other_dept:
            ai_dept = departments.get("دپارتمان هوش مصنوعی")
            if ai_dept is None:
                ai_dept = db.scalars(
                    select(Department).where(
                        Department.org_id == ORG_ID,
                        Department.name == "دپارتمان هوش مصنوعی",
                    )
                ).first()
            refer_dept_id = ai_dept.id if ai_dept else None

        consultation = Consultation(
            person_id=person.id,
            department_id=dept.id,
            consultant_id=admission.id,
            current_level="متوسط" if index % 2 else "مبتدی",
            need="یادگیری مهارت جدید",
            goal="ارتقای شغلی",
            outcome=outcome,
            refer_to_department_id=refer_dept_id,
            notes="مشاوره اولیه",
            org_id=ORG_ID,
        )
        db.add(consultation)
        db.flush()
        consultations.append(consultation)
    db.commit()
    print(f"  created {len(consultations)} consultations")
    return consultations


def seed_journeys(db) -> int:
    consultations = list(
        db.scalars(
            select(Consultation).where(Consultation.org_id == ORG_ID).order_by(Consultation.id)
        ).all()
    )
    created = 0
    for consultation in consultations:
        existing = db.scalars(
            select(Journey).where(
                Journey.org_id == ORG_ID,
                Journey.person_id == consultation.person_id,
                Journey.department_id == consultation.department_id,
            )
        ).first()
        if existing is not None:
            continue
        journey_service.get_or_create_journey(
            db, ORG_ID, consultation.person_id, consultation.department_id
        )
        created += 1
    print(f"  created {created} journeys")
    return created


def seed_enrollments(
    db,
    people: list[Person],
    classes: dict[str, CourseClass],
    courses: dict[str, Course],
) -> list[Enrollment]:
    existing_count = db.scalar(
        select(func.count()).select_from(Enrollment).where(Enrollment.org_id == ORG_ID)
    )
    if existing_count and existing_count >= 10:
        return list(
            db.scalars(
                select(Enrollment).where(Enrollment.org_id == ORG_ID).order_by(Enrollment.id).limit(10)
            ).all()
        )

    python_101 = classes["Python 101"]
    python_102 = classes["Python 102"]
    ielts = classes["IELTS Intensive"]

    python_course = next(c for t, c in courses.items() if "Python" in t)
    ielts_course = next(c for t, c in courses.items() if "IELTS" in t)

    enrollment_people = people[6:16]
    specs: list[tuple[Person, CourseClass, Course, EnrollmentStatus]] = [
        (enrollment_people[0], python_101, python_course, EnrollmentStatus.active),
        (enrollment_people[1], python_101, python_course, EnrollmentStatus.active),
        (enrollment_people[2], python_101, python_course, EnrollmentStatus.active),
        (enrollment_people[3], python_101, python_course, EnrollmentStatus.active),
        (enrollment_people[4], python_101, python_course, EnrollmentStatus.active),
        (enrollment_people[5], python_102, python_course, EnrollmentStatus.completed),
        (enrollment_people[6], python_102, python_course, EnrollmentStatus.completed),
        (enrollment_people[7], ielts, ielts_course, EnrollmentStatus.active),
        (enrollment_people[8], ielts, ielts_course, EnrollmentStatus.pre_enroll),
        (enrollment_people[9], ielts, ielts_course, EnrollmentStatus.dropped),
    ]

    enrollments: list[Enrollment] = []
    for person, course_class, course, status in specs:
        enrollment = Enrollment(
            person_id=person.id,
            class_id=course_class.id,
            status=status,
            price_snapshot=course.current_price,
            discount_snapshot=0,
            final_amount=course.current_price,
            start_date=course_class.start_date,
            org_id=ORG_ID,
        )
        db.add(enrollment)
        db.flush()
        enrollments.append(enrollment)
    db.commit()
    print(f"  created {len(enrollments)} enrollments")
    return enrollments


def seed_invoices(db, enrollments: list[Enrollment]) -> None:
    from app.finance.model import Invoice

    created = 0
    for index, enrollment in enumerate(enrollments):
        invoice_row = db.scalars(
            select(Invoice).where(
                Invoice.org_id == ORG_ID,
                Invoice.enrollment_id == enrollment.id,
            )
        ).first()
        if invoice_row is not None:
            continue

        half = enrollment.final_amount // 2
        remainder = enrollment.final_amount - half
        if index in (4, 9):
            first_due = date(2026, 3, 15)
            second_due = date(2026, 6, 1)
        elif index == 8:
            first_due = date(2026, 9, 1)
            second_due = date(2026, 11, 1)
        else:
            first_due = date(2026, 2, 1)
            second_due = date(2026, 5, 1)

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
        created += 1

        if enrollment.status == EnrollmentStatus.dropped:
            finance_service.cancel_installments_on_drop(db, ORG_ID, enrollment.id)

    print(f"  created invoices for {created} enrollments")


def seed_payments(db, enrollments: list[Enrollment]) -> None:
    finance_user = _get_user_by_role_key(db, "finance")
    from app.finance.model import Invoice

    payment_plan: list[tuple[int, int, int | None]] = [
        (0, 1, None),
        (1, 1, None),
        (2, 1, None),
        (2, 2, None),
        (3, 1, None),
        (5, 1, None),
        (5, 2, None),
        (6, 1, None),
    ]

    for enrollment_index, sequence, partial_amount in payment_plan:
        enrollment = enrollments[enrollment_index]
        invoice = db.scalars(
            select(Invoice).where(Invoice.org_id == ORG_ID, Invoice.enrollment_id == enrollment.id)
        ).first()
        if invoice is None:
            continue
        installments = finance_service.get_installments_for_invoice(db, ORG_ID, invoice.id)
        installment = next(i for i in installments if i.sequence == sequence)
        if installment.paid_amount > 0:
            continue
        amount = partial_amount if partial_amount is not None else installment.amount
        if enrollment_index == 3 and sequence == 1:
            amount = installment.amount // 2
        finance_service.record_payment(
            db,
            ORG_ID,
            installment.id,
            amount,
            finance_user.id,
            payment_date=date(2026, 2, 15),
        )

    for enrollment_index in (3, 4):
        enrollment = enrollments[enrollment_index]
        invoice = db.scalars(
            select(Invoice).where(Invoice.org_id == ORG_ID, Invoice.enrollment_id == enrollment.id)
        ).first()
        if invoice is None:
            continue
        installments = finance_service.get_installments_for_invoice(db, ORG_ID, invoice.id)
        for inst in installments:
            finance_service.recompute_installment_status(inst)
    db.commit()
    print("  recorded payments")


def seed_tasks(db, people: list[Person]) -> None:
    existing_count = db.scalar(select(func.count()).select_from(Task).where(Task.org_id == ORG_ID))
    if existing_count and existing_count >= 10:
        print("  skip tasks")
        return

    admission = _get_user_by_role_key(db, "admission")
    manager = _get_user_by_role_key(db, "manager")
    today = date.today()

    task_specs: list[tuple[TaskType, str, TaskStatus, User]] = [
        (TaskType.follow_up_registration, "پیگیری ثبت‌نام", TaskStatus.open, admission),
        (TaskType.follow_up_registration, "تماس مجدد با متقاضی", TaskStatus.open, admission),
        (TaskType.follow_up_registration, "ارسال اطلاعات دوره", TaskStatus.done, admission),
        (TaskType.installment_overdue, "اقساط معوق", TaskStatus.open, manager),
        (TaskType.installment_overdue, "یادآوری پرداخت", TaskStatus.open, manager),
        (TaskType.pre_enroll_unpaid, "پیش‌ثبت‌نام بدون پرداخت", TaskStatus.open, admission),
        (TaskType.pre_enroll_unpaid, "پیگیری پیش‌پرداخت", TaskStatus.done, admission),
        (TaskType.post_course_consultation, "مشاوره پس از دوره", TaskStatus.open, manager),
        (TaskType.post_course_consultation, "ارزیابی پایان دوره", TaskStatus.cancelled, manager),
        (TaskType.custom, "کار سفارشی", TaskStatus.open, manager),
    ]

    for index, (task_type, title, status, assignee) in enumerate(task_specs):
        task = Task(
            person_id=people[index % len(people)].id,
            type=task_type,
            title=title,
            description="وظیفه نمونه برای تست",
            due_date=today + timedelta(days=index + 1),
            assignee_id=assignee.id,
            status=status,
            org_id=ORG_ID,
            completed_at=datetime.now(UTC) if status == TaskStatus.done else None,
        )
        db.add(task)
    db.commit()
    print("  created 10 tasks")


def _first_installment_for_enrollment(db, enrollment_id: int):
    from app.finance.model import Installment, Invoice

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
    people: list[Person],
    consultations: list[Consultation],
    enrollments: list[Enrollment],
) -> None:
    existing_count = db.scalar(
        select(func.count()).select_from(Activity).where(Activity.org_id == ORG_ID)
    )
    if existing_count:
        db.execute(delete(Activity).where(Activity.org_id == ORG_ID))
        db.commit()
        print(f"  cleared {existing_count} old activities (timeline demo rebuild)")

    admission = _get_user_by_role_key(db, "admission")
    finance_user = _get_user_by_role_key(db, "finance")
    created = 0

    demo_enrollment = enrollments[0]
    demo_person_id = demo_enrollment.person_id
    demo_consultation = next(
        (c for c in consultations if c.person_id == demo_person_id),
        consultations[0],
    )
    demo_installment = _first_installment_for_enrollment(db, demo_enrollment.id)
    demo_task = db.scalars(
        select(Task).where(Task.org_id == ORG_ID).order_by(Task.id).limit(1)
    ).first()

    log_activity(
        db,
        ORG_ID,
        demo_person_id,
        "consultation_done",
        payload={
            "consultation_id": demo_consultation.id,
            "outcome": (
                demo_consultation.outcome.value if demo_consultation.outcome else None
            ),
        },
        actor_id=admission.id,
    )
    created += 1

    log_activity(
        db,
        ORG_ID,
        demo_person_id,
        "enrollment_created",
        payload={
            "enrollment_id": demo_enrollment.id,
            "class_id": demo_enrollment.class_id,
            "status": demo_enrollment.status.value,
        },
        actor_id=admission.id,
    )
    created += 1

    if demo_installment is not None:
        log_activity(
            db,
            ORG_ID,
            demo_person_id,
            "payment_recorded",
            payload={
                "enrollment_id": demo_enrollment.id,
                "installment_id": demo_installment.id,
                "amount": demo_installment.paid_amount or demo_installment.amount // 2,
                "invoice_id": demo_installment.invoice_id,
            },
            actor_id=finance_user.id,
        )
        created += 1

    if demo_task is not None:
        log_activity(
            db,
            ORG_ID,
            demo_person_id,
            "task_created",
            payload={
                "task_id": demo_task.id,
                "task_type": demo_task.type.value,
                "title": demo_task.title,
                "due_date": demo_task.due_date.isoformat(),
            },
            actor_id=admission.id,
        )
        created += 1

    log_activity(
        db,
        ORG_ID,
        demo_person_id,
        "manual_note",
        payload={"note": "علاقه‌مند به کلاس عصر — پیگیری هفته آینده"},
        actor_id=admission.id,
    )
    created += 1

    completed_enrollment = next(
        (e for e in enrollments if e.status == EnrollmentStatus.completed),
        enrollments[5],
    )
    log_activity(
        db,
        ORG_ID,
        completed_enrollment.person_id,
        "course_completed",
        payload={
            "enrollment_id": completed_enrollment.id,
            "class_id": completed_enrollment.class_id,
        },
        actor_id=admission.id,
    )
    created += 1

    dropped_enrollment = next(
        (e for e in enrollments if e.status == EnrollmentStatus.dropped),
        enrollments[-1],
    )
    log_activity(
        db,
        ORG_ID,
        dropped_enrollment.person_id,
        "enrollment_dropped",
        payload={
            "enrollment_id": dropped_enrollment.id,
            "reason": "عدم پرداخت به موقع",
            "notes": "پس از دو بار یادآوری",
        },
        actor_id=admission.id,
    )
    created += 1

    refund_enrollment = enrollments[3]
    refund_installment = _first_installment_for_enrollment(db, refund_enrollment.id)
    if refund_installment is not None:
        log_activity(
            db,
            ORG_ID,
            refund_enrollment.person_id,
            "payment_refunded",
            payload={
                "enrollment_id": refund_enrollment.id,
                "installment_id": refund_installment.id,
                "amount": refund_installment.paid_amount or 500_000,
                "reason": "انصراف از دوره",
            },
            actor_id=finance_user.id,
        )
        created += 1

    for consultation in consultations[:5]:
        if consultation.person_id == demo_person_id:
            continue
        log_activity(
            db,
            ORG_ID,
            consultation.person_id,
            "consultation_done",
            payload={
                "consultation_id": consultation.id,
                "outcome": (
                    consultation.outcome.value if consultation.outcome else None
                ),
            },
            actor_id=admission.id,
        )
        created += 1

    for enrollment in enrollments[1:5]:
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
            actor_id=admission.id,
        )
        created += 1

        installment = _first_installment_for_enrollment(db, enrollment.id)
        if installment is None:
            continue
        log_activity(
            db,
            ORG_ID,
            enrollment.person_id,
            "payment_recorded",
            payload={
                "enrollment_id": enrollment.id,
                "installment_id": installment.id,
                "amount": installment.paid_amount or installment.amount // 2,
                "invoice_id": installment.invoice_id,
            },
            actor_id=finance_user.id,
        )
        created += 1

    print(f"  created {created} activities")


def seed_communications(db, people: list[Person]) -> None:
    from app.communication.enums import CommunicationChannel, CommunicationDirection
    from app.communication.model import Communication

    expected_count = 6
    existing_count = db.scalar(
        select(func.count())
        .select_from(Communication)
        .where(Communication.org_id == ORG_ID)
    )
    if existing_count:
        db.execute(delete(Communication).where(Communication.org_id == ORG_ID))
        db.commit()
        if existing_count != expected_count:
            print(f"  cleared {existing_count} old communications (timeline demo rebuild)")

    demo_people = people[6:9]
    specs: list[tuple[Person, CommunicationChannel, CommunicationDirection, str]] = [
        (
            demo_people[0],
            CommunicationChannel.phone,
            CommunicationDirection.outbound,
            "تماس برای تأیید زمان کلاس و پرداخت اولین قسط.",
        ),
        (
            demo_people[0],
            CommunicationChannel.sms,
            CommunicationDirection.outbound,
            "یادآوری جلسه مشاوره فردا ساعت ۱۰.",
        ),
        (
            demo_people[0],
            CommunicationChannel.email,
            CommunicationDirection.inbound,
            "درخواست تغییر زمان کلاس به شیفت عصر.",
        ),
        (
            demo_people[1],
            CommunicationChannel.phone,
            CommunicationDirection.inbound,
            "پرسش درباره تخفیف خواهر و برادر.",
        ),
        (
            demo_people[2],
            CommunicationChannel.in_person,
            CommunicationDirection.outbound,
            "مراجعه حضوری برای تکمیل فرم ثبت‌نام.",
        ),
        (
            people[5],
            CommunicationChannel.chat,
            CommunicationDirection.inbound,
            "سؤال درباره پیش‌نیاز دوره Python.",
        ),
    ]

    for person, channel, direction, content in specs:
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
    existing_count = db.scalar(
        select(func.count()).select_from(Attendance).where(Attendance.org_id == ORG_ID)
    )
    if existing_count and existing_count >= 20:
        print("  skip attendances")
        return

    python_101_enrollments = enrollments[:5]
    session_dates = [
        date(2026, 1, 8),
        date(2026, 1, 15),
        date(2026, 1, 22),
        date(2026, 1, 29),
    ]
    present_pattern = [
        [True, True, False, True],
        [True, False, True, True],
        [False, True, True, False],
        [True, True, True, True],
        [True, False, False, True],
    ]

    for enrollment_index, enrollment in enumerate(python_101_enrollments):
        for session_index, session_date in enumerate(session_dates):
            existing = db.scalars(
                select(Attendance).where(
                    Attendance.org_id == ORG_ID,
                    Attendance.enrollment_id == enrollment.id,
                    Attendance.session_date == session_date,
                )
            ).first()
            if existing:
                continue
            attendance = Attendance(
                enrollment_id=enrollment.id,
                session_date=session_date,
                present=present_pattern[enrollment_index][session_index],
                org_id=ORG_ID,
            )
            db.add(attendance)
    db.commit()
    print("  created attendances")


def main() -> None:
    db = SessionLocal()
    try:
        org = db.get(Organization, ORG_ID)
        if org is None:
            print(f"Organization id={ORG_ID} not found. Run migrations first.")
            return

        if _already_seeded(db):
            print("Seed data already present — backfilling…")
            seed_journeys(db)
            enrollments = list(
                db.scalars(
                    select(Enrollment)
                    .where(Enrollment.org_id == ORG_ID)
                    .order_by(Enrollment.id)
                    .limit(10)
                ).all()
            )
            consultations = list(
                db.scalars(
                    select(Consultation)
                    .where(Consultation.org_id == ORG_ID)
                    .order_by(Consultation.id)
                ).all()
            )
            people = list(
                db.scalars(
                    select(Person).where(Person.org_id == ORG_ID).order_by(Person.id)
                ).all()
            )
            seed_activities(db, people, consultations, enrollments)
            seed_communications(db, people)
            return

        print("Seeding users…")
        seed_users(db)

        print("Seeding departments…")
        departments = seed_departments(db)

        print("Seeding courses…")
        courses = seed_courses(db, departments)

        print("Seeding classes…")
        classes = seed_classes(db, courses)

        print("Seeding people…")
        people = seed_people(db)

        print("Seeding consultations…")
        consultations = seed_consultations(db, people, departments)

        print("Seeding journeys…")
        seed_journeys(db)

        print("Seeding enrollments…")
        enrollments = seed_enrollments(db, people, classes, courses)

        print("Seeding invoices…")
        seed_invoices(db, enrollments)

        print("Seeding payments…")
        seed_payments(db, enrollments)

        print("Seeding tasks…")
        seed_tasks(db, people)

        print("Seeding activities…")
        seed_activities(db, people, consultations, enrollments)

        print("Seeding communications…")
        seed_communications(db, people)

        print("Seeding attendances…")
        seed_attendances(db, enrollments)

        print("Done.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
