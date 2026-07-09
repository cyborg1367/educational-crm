import type { TaskRead, TaskStatus, TaskType } from "@/lib/api/types";
import {
  addDaysToStorageDate,
  formatDateDisplay,
  type StorageDate,
  todayStorage,
} from "@/lib/locale/date";
import { formatCount, toPersianDigits } from "@/lib/locale/number";
import { TASK_TYPE_LABELS } from "@/lib/terminology";

export type TaskDueBucket = "overdue" | "today" | "upcoming" | "other";

/** Temporal work-queue views shown in the inbox toolbar. */
export type TaskViewChipId = "overdue" | "today" | "week" | "open";

export type TaskViewCounts = Record<TaskViewChipId, number>;

export type TaskSecondaryFilters = {
  types: TaskType[];
  assigneeId: string | null;
  /** When not `open`, temporal view chips are ignored. */
  status: TaskStatus | "all";
};

export const DEFAULT_TASK_SECONDARY_FILTERS: TaskSecondaryFilters = {
  types: [],
  assigneeId: null,
  status: "open",
};

const BUCKET_ORDER: TaskDueBucket[] = [
  "overdue",
  "today",
  "upcoming",
  "other",
];

const VIEW_CHIP_ORDER: TaskViewChipId[] = [
  "overdue",
  "today",
  "week",
  "open",
];

export const TASK_BUCKET_LABELS: Record<TaskDueBucket, string> = {
  overdue: "معوقه",
  today: "امروز",
  upcoming: "آینده",
  other: "سایر",
};

export const TASK_VIEW_CHIP_LABELS: Record<TaskViewChipId, string> = {
  overdue: "معوقه",
  today: "امروز",
  week: "این هفته",
  open: "همه باز",
};

/** @deprecated Use TASK_VIEW_CHIP_LABELS */
export const TASK_PRIORITY_CHIP_LABELS = TASK_VIEW_CHIP_LABELS;

function dayDiff(from: StorageDate, to: StorageDate): number {
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  return Math.round((toMs - fromMs) / 86_400_000);
}

export function getTaskDueBucket(
  dueDate: StorageDate,
  today: StorageDate = todayStorage(),
): TaskDueBucket {
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  return "upcoming";
}

export function formatDueRelative(
  dueDate: StorageDate,
  today: StorageDate = todayStorage(),
): string {
  const diff = dayDiff(today, dueDate);
  if (diff === 0) return "امروز";
  if (diff === 1) return "فردا";
  if (diff === -1) return "دیروز";
  if (diff < 0) {
    return `${toPersianDigits(String(Math.abs(diff)))} روز گذشته`;
  }
  if (diff <= 7) {
    return `${toPersianDigits(String(diff))} روز دیگر`;
  }
  return formatDateDisplay(dueDate);
}

export function isWithinThisWeek(
  dueDate: StorageDate,
  today: StorageDate = todayStorage(),
): boolean {
  const weekEnd = addDaysToStorageDate(today, 6);
  return dueDate >= today && dueDate <= weekEnd;
}

export function matchesViewChip(
  task: TaskRead,
  chip: TaskViewChipId,
  today: StorageDate = todayStorage(),
): boolean {
  switch (chip) {
    case "overdue":
      return task.status === "open" && task.due_date < today;
    case "today":
      return task.status === "open" && task.due_date === today;
    case "week":
      return task.status === "open" && isWithinThisWeek(task.due_date, today);
    case "open":
      return task.status === "open";
    default:
      return true;
  }
}

/** @deprecated Use matchesViewChip */
export const matchesPriorityChip = matchesViewChip;

export function countViewChips(
  tasks: TaskRead[],
  today: StorageDate = todayStorage(),
): TaskViewCounts {
  const counts: TaskViewCounts = {
    overdue: 0,
    today: 0,
    week: 0,
    open: 0,
  };
  for (const task of tasks) {
    if (task.status === "open") {
      counts.open += 1;
      if (task.due_date < today) counts.overdue += 1;
      if (task.due_date === today) counts.today += 1;
      if (isWithinThisWeek(task.due_date, today)) counts.week += 1;
    }
  }
  return counts;
}

/** @deprecated Use countViewChips */
export const countPriorityChips = countViewChips;

export function matchesSecondaryFilters(
  task: TaskRead,
  filters: TaskSecondaryFilters,
): boolean {
  if (filters.status !== "all" && task.status !== filters.status) {
    return false;
  }
  if (filters.types.length > 0 && !filters.types.includes(task.type)) {
    return false;
  }
  if (filters.assigneeId === "unassigned" && task.assignee_id !== null) {
    return false;
  }
  if (
    filters.assigneeId &&
    filters.assigneeId !== "unassigned" &&
    String(task.assignee_id ?? "") !== filters.assigneeId
  ) {
    return false;
  }
  return true;
}

export function countSecondaryFilterActive(filters: TaskSecondaryFilters): number {
  let count = 0;
  if (filters.types.length > 0) count += filters.types.length;
  if (filters.assigneeId) count += 1;
  if (filters.status !== "open") count += 1;
  return count;
}

export function getDefaultViewChip(counts: TaskViewCounts): TaskViewChipId {
  if (counts.overdue > 0) return "overdue";
  if (counts.today > 0) return "today";
  return "open";
}

export type TaskQueueStats = {
  total: number;
  overdue: number;
  today: number;
  upcoming: number;
  other: number;
};

export function summarizeQueue(
  tasks: TaskRead[],
  today: StorageDate = todayStorage(),
): TaskQueueStats {
  const stats: TaskQueueStats = {
    total: tasks.length,
    overdue: 0,
    today: 0,
    upcoming: 0,
    other: 0,
  };
  for (const task of tasks) {
    if (task.status !== "open") {
      stats.other += 1;
      continue;
    }
    const bucket = getTaskDueBucket(task.due_date, today);
    if (bucket === "overdue") stats.overdue += 1;
    else if (bucket === "today") stats.today += 1;
    else stats.upcoming += 1;
  }
  return stats;
}

export function filterTasksBySearch(
  tasks: TaskRead[],
  query: string,
  peopleNames: Map<number, string>,
): TaskRead[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return tasks;
  return tasks.filter((task) => {
    const personName = peopleNames.get(task.person_id)?.toLowerCase() ?? "";
    return (
      task.title.toLowerCase().includes(normalized) ||
      personName.includes(normalized) ||
      (task.description?.toLowerCase().includes(normalized) ?? false) ||
      TASK_TYPE_LABELS[task.type].toLowerCase().includes(normalized)
    );
  });
}

export function taskTypePillClassName(
  type: TaskType,
  overdue: boolean,
): string {
  if (overdue || type === "installment_overdue") {
    return "border-[var(--semantic-color-status-danger)]/30 bg-[var(--semantic-color-status-danger)]/8 text-[var(--semantic-color-status-danger)]";
  }
  if (type === "follow_up_registration" || type === "pre_enroll_unpaid") {
    return "border-[var(--primitive-color-brand-300)] bg-[var(--primitive-color-brand-50)] text-[var(--primitive-color-brand-800)]";
  }
  if (type === "referral" || type === "post_course_consultation") {
    return "border-[color-mix(in_srgb,#4169E1_35%,var(--semantic-color-surface-border))] bg-[color-mix(in_srgb,#eef2ff_65%,var(--semantic-color-surface-card))] text-[var(--primitive-color-brand-800)]";
  }
  return "border-[var(--primitive-color-brand-200)]/80 bg-[var(--primitive-color-brand-50)]/70 text-[var(--primitive-color-brand-700)]";
}

export function hasSecondaryFilters(filters: TaskSecondaryFilters): boolean {
  return countSecondaryFilterActive(filters) > 0;
}

export function groupTasksByDueBucket(
  tasks: TaskRead[],
  today: StorageDate = todayStorage(),
): Array<{ bucket: TaskDueBucket; label: string; items: TaskRead[] }> {
  const buckets: Record<TaskDueBucket, TaskRead[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    other: [],
  };

  for (const task of tasks) {
    if (task.status === "open") {
      buckets[getTaskDueBucket(task.due_date, today)].push(task);
    } else {
      buckets.other.push(task);
    }
  }

  for (const bucket of BUCKET_ORDER) {
    buckets[bucket].sort((a, b) => {
      if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
      return a.id - b.id;
    });
  }

  return BUCKET_ORDER.filter((bucket) => buckets[bucket].length > 0).map(
    (bucket) => ({
      bucket,
      label: TASK_BUCKET_LABELS[bucket],
      items: buckets[bucket],
    }),
  );
}

export function formatChipCount(count: number): string {
  return formatCount(count);
}

export function relatedEntityHref(task: TaskRead): string | undefined {
  const id = task.related_entity_id;
  if (!id || !task.related_entity_type) return undefined;
  if (task.related_entity_type === "person") return `/people/${id}`;
  if (task.related_entity_type === "consultation") {
    return `/people/${task.person_id}/consultations/${id}`;
  }
  if (task.related_entity_type === "enrollment") return `/enrollments/${id}`;
  if (task.related_entity_type === "invoice") return `/invoices/${id}`;
  return undefined;
}

export function relatedEntityLabel(type: string | null | undefined): string {
  switch (type) {
    case "person":
      return "شخص";
    case "consultation":
      return "مشاوره";
    case "enrollment":
      return "ثبت‌نام";
    case "invoice":
      return "فاکتور";
    case "installment":
      return "قسط";
    default:
      return "ارتباط";
  }
}

export { VIEW_CHIP_ORDER };
