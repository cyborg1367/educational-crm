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

export function mapClassStartDates(classes: CourseClassRead[]): CalendarEvent[] {
  return classes.map((cls) => ({
    date: cls.start_date,
    label: cls.name,
    type: "class" as const,
    href: `/classes/${cls.id}`,
  }));
}

export function mapInstallmentDueDates(
  installments: InstallmentRead[],
): CalendarEvent[] {
  return installments.map((installment) => ({
    date: installment.due_date,
    label: `قسط ${installment.sequence} — ${formatToman(installment.amount, { suffix: true })}`,
    type: "installment" as const,
    href: `/invoices/${installment.invoice_id}`,
  }));
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
