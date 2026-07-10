import dayjs from "dayjs";

import type { StorageDate } from "@/lib/locale/date";
import type {
  CourseClassRead,
  InstallmentRead,
  TaskRead,
} from "@/lib/api/types";
import { formatToman } from "@/lib/locale/number";

export type CalendarEventType = "class" | "installment" | "task";

export type CalendarEvent = {
  date: StorageDate;
  label: string;
  type: CalendarEventType;
  href?: string;
};

/** API weekday values → JS day-of-week (dayjs .day(): 0=Sunday … 6=Saturday). */
const WEEKDAY_TO_JS_DAY: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function mapClassStartDates(classes: CourseClassRead[]): CalendarEvent[] {
  return classes.map((cls) => ({
    date: cls.start_date,
    label: cls.name,
    type: "class" as const,
    href: `/classes/${cls.id}`,
  }));
}

/**
 * Expand class schedules into per-session events inside [from, to].
 *
 * A class meeting on Saturdays and Mondays appears on every Saturday and
 * Monday between its start and end dates — not just once on its start date.
 * The start date itself is labeled as the first session. Classes without
 * weekday info fall back to a single event on their start date.
 */
export function mapClassSessions(
  classes: CourseClassRead[],
  range: { from: StorageDate; to: StorageDate },
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const cls of classes) {
    const weekdays = (cls.weekdays ?? [])
      .map((day) => WEEKDAY_TO_JS_DAY[day])
      .filter((day): day is number => day !== undefined);

    if (weekdays.length === 0) {
      if (cls.start_date >= range.from && cls.start_date <= range.to) {
        events.push({
          date: cls.start_date,
          label: cls.name,
          type: "class",
          href: `/classes/${cls.id}`,
        });
      }
      continue;
    }

    const windowStart = cls.start_date > range.from ? cls.start_date : range.from;
    const windowEnd =
      cls.end_date != null && cls.end_date < range.to ? cls.end_date : range.to;

    let cursor = dayjs(windowStart);
    const end = dayjs(windowEnd);
    const weekdaySet = new Set(weekdays);

    while (!cursor.isAfter(end, "day")) {
      if (weekdaySet.has(cursor.day())) {
        const cursorDate = cursor.format("YYYY-MM-DD") as StorageDate;
        events.push({
          date: cursorDate,
          label:
            cursorDate === cls.start_date ? `شروع ${cls.name}` : cls.name,
          type: "class",
          href: `/classes/${cls.id}`,
        });
      }
      cursor = cursor.add(1, "day");
    }
  }

  return events;
}

/**
 * Map installments to due-date calendar events.
 *
 * Paid and cancelled installments need no follow-up (the upfront
 * installment recorded during enrollment, in particular, is paid the
 * moment it's created) — only unresolved ones belong on the calendar.
 * Partially paid installments show the remaining balance, not the
 * original amount, so the number on the calendar matches what's still
 * owed.
 */
export function mapInstallmentDueDates(
  installments: InstallmentRead[],
): CalendarEvent[] {
  return installments
    .filter(
      (installment) =>
        installment.status !== "paid" && installment.status !== "cancelled",
    )
    .map((installment) => {
      const remaining = installment.amount - installment.paid_amount;
      return {
        date: installment.due_date,
        label: `قسط ${installment.sequence} — ${formatToman(remaining, { suffix: true })}`,
        type: "installment" as const,
        href: `/invoices/${installment.invoice_id}`,
      };
    });
}

export function mapTaskDueDates(tasks: TaskRead[]): CalendarEvent[] {
  return tasks
    .filter((task) => task.status === "open")
    .map((task) => ({
      date: task.due_date,
      label: task.title,
      type: "task" as const,
      href: `/tasks?selected=${task.id}`,
    }));
}

export function mergeCalendarEvents(
  ...eventGroups: CalendarEvent[][]
): CalendarEvent[] {
  return eventGroups.flat();
}

export const CALENDAR_EVENT_TYPE_COLORS: Record<CalendarEventType, string> = {
  class: "var(--semantic-color-action-primary)",
  installment: "var(--semantic-color-status-warning)",
  task: "var(--semantic-color-status-neutral)",
};

export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  class: "کلاس",
  installment: "قسط",
  task: "وظیفه",
};
