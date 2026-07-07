import {
  mergeCalendarEvents,
  mapClassStartDates,
  mapInstallmentDueDates,
  mapTaskDueDates,
} from "@/components/data-display";
import type {
  CourseClassRead,
  InstallmentRead,
  TaskRead,
} from "@/lib/api/types";
import { todayStorage } from "@/lib/locale";

const MOCK_ORG_ID = 1;
const MOCK_PERSON_ID = 42;

function daysFromToday(offset: number): string {
  const d = new Date(todayStorage());
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

const mockClasses: CourseClassRead[] = [
  {
    id: 1,
    course_id: 1,
    teacher_id: 5,
    name: "IELTS Morning Batch",
    start_date: daysFromToday(3),
    end_date: null,
    weekdays: ["saturday", "monday", "wednesday"],
    status: "planned",
    org_id: MOCK_ORG_ID,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    course_id: 2,
    teacher_id: 6,
    name: "Python Basics — Spring",
    start_date: daysFromToday(10),
    end_date: null,
    weekdays: ["tuesday", "thursday"],
    status: "planned",
    org_id: MOCK_ORG_ID,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const mockInstallments: InstallmentRead[] = [
  {
    id: 1,
    invoice_id: 100,
    sequence: 1,
    amount: 2_500_000,
    paid_amount: 0,
    due_date: daysFromToday(5),
    status: "pending",
    org_id: MOCK_ORG_ID,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const mockTasks: TaskRead[] = [
  {
    id: 1,
    person_id: MOCK_PERSON_ID,
    type: "follow_up_registration",
    title: "پیگیری ثبت‌نام",
    description: null,
    due_date: daysFromToday(2),
    assignee_id: 2,
    status: "open",
    related_entity_type: null,
    related_entity_id: null,
    org_id: MOCK_ORG_ID,
    created_at: "2026-01-01T00:00:00Z",
    completed_at: null,
  },
];

export const demoCalendarEvents = mergeCalendarEvents(
  mapClassStartDates(mockClasses),
  mapInstallmentDueDates(mockInstallments),
  mapTaskDueDates(mockTasks),
);

export const demoListFacets = [
  {
    id: "status",
    type: "select" as const,
    label: "وضعیت",
    placeholder: "همه وضعیت‌ها",
    options: [
      { value: "active", label: "فعال" },
      { value: "lead", label: "سرنخ" },
      { value: "student", label: "دانش‌آموز" },
    ],
  },
  {
    id: "department",
    type: "select" as const,
    label: "دپارتمان",
    placeholder: "همه دپارتمان‌ها",
    options: [
      { value: "programming", label: "برنامه‌نویسی" },
      { value: "design", label: "طراحی" },
    ],
  },
];

export const demoSplitFacets = [
  {
    id: "type",
    type: "select" as const,
    label: "نوع",
    placeholder: "همه انواع",
    options: [
      { value: "follow_up", label: "پیگیری" },
      { value: "payment", label: "پرداخت" },
    ],
  },
  {
    id: "assignee",
    type: "select" as const,
    label: "مسئول",
    placeholder: "همه",
    options: [
      { value: "me", label: "من" },
      { value: "team", label: "تیم" },
    ],
  },
];
