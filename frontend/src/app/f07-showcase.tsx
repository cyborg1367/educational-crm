"use client";

import { useSearchParams } from "next/navigation";
import {
  AnalyticsChart,
  CalendarAgenda,
  mergeCalendarEvents,
  mapClassStartDates,
  mapInstallmentDueDates,
  mapTaskDueDates,
  mockCollectionGaugeChart,
  mockEnrollmentTrendChart,
  mockRevenueByCourseChart,
  Timeline,
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
  {
    id: 2,
    invoice_id: 100,
    sequence: 2,
    amount: 2_500_000,
    paid_amount: 0,
    due_date: daysFromToday(35),
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
  {
    id: 2,
    person_id: MOCK_PERSON_ID,
    type: "pre_enroll_unpaid",
    title: "پیگیری پرداخت قسط",
    description: null,
    due_date: daysFromToday(7),
    assignee_id: 3,
    status: "open",
    related_entity_type: null,
    related_entity_id: null,
    org_id: MOCK_ORG_ID,
    created_at: "2026-01-01T00:00:00Z",
    completed_at: null,
  },
];

const calendarEvents = mergeCalendarEvents(
  mapClassStartDates(mockClasses),
  mapInstallmentDueDates(mockInstallments),
  mapTaskDueDates(mockTasks),
);

export function F07Showcase() {
  const searchParams = useSearchParams();
  const emptyTimeline = searchParams.get("emptyTimeline") === "1";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-[var(--semantic-space-sectionGap)] p-[var(--semantic-space-pageMargin)]">
      <header>
        <h1 className="text-[length:var(--primitive-font-size-2xl)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          F07 — Timeline / Calendar / Analytics
        </h1>
        <p className="mt-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
          نمایش آزمایشی با دادهٔ mock
        </p>
      </header>

      <section>
        <h2 className="mb-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-lg)] font-[var(--primitive-font-weight-medium)]">
          Timeline
        </h2>
        <div className="rounded-[var(--primitive-radius-md)] bg-[var(--semantic-color-surface-card)] p-[var(--semantic-space-cardPadding)] shadow-[var(--primitive-elevation-1)]">
          <Timeline
            personId={emptyTimeline ? 0 : MOCK_PERSON_ID}
            orgId={MOCK_ORG_ID}
            useMock
          />
        </div>
      </section>

      <section className="grid gap-[var(--semantic-space-sectionGap)] lg:grid-cols-2">
        <div>
          <h2 className="mb-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-lg)] font-[var(--primitive-font-weight-medium)]">
            Calendar — Month
          </h2>
          <CalendarAgenda events={calendarEvents} mode="month" />
        </div>
        <div>
          <h2 className="mb-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-lg)] font-[var(--primitive-font-weight-medium)]">
            Calendar — Agenda
          </h2>
          <CalendarAgenda events={calendarEvents} mode="agenda" />
        </div>
      </section>

      <section className="grid gap-[var(--semantic-space-sectionGap)] lg:grid-cols-2">
        <AnalyticsChart data={mockEnrollmentTrendChart} />
        <AnalyticsChart data={mockRevenueByCourseChart} />
        <AnalyticsChart data={mockCollectionGaugeChart} height={200} />
      </section>
    </div>
  );
}
