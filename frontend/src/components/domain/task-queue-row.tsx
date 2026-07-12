"use client";

import * as React from "react";

import { StatusBadge } from "@/components/domain/status-badge";
import { focusVisibleStyles } from "@/components/form/control-styles";
import { Avatar } from "@/components/primitives/avatar";
import type { TaskRead } from "@/lib/api/types";
import { formatDateDisplay } from "@/lib/locale/date";
import { formatPhoneDisplay } from "@/lib/locale/number";
import {
  formatDueRelative,
  getTaskDueBucket,
  taskTypePillClassName,
  type TaskDueBucket,
} from "@/lib/task/queue";
import { TASK_TYPE_LABELS } from "@/lib/terminology";
import { cn } from "@/lib/utils";

export type TaskQueueRowProps = {
  task: TaskRead;
  personName: string;
  personPhone?: string | null;
  assigneeName?: string | null;
  selected?: boolean;
  today: string;
  onSelect: (taskId: number) => void;
};

function TaskQueueRow({
  task,
  personName,
  personPhone,
  assigneeName,
  selected = false,
  today,
  onSelect,
}: TaskQueueRowProps) {
  const bucket: TaskDueBucket =
    task.status === "open" ? getTaskDueBucket(task.due_date, today) : "other";
  const overdue = bucket === "overdue";
  const relativeDue = formatDueRelative(task.due_date, today);
  const absoluteDue = formatDateDisplay(task.due_date);

  return (
    <button
      type="button"
      onClick={() => onSelect(task.id)}
      aria-pressed={selected}
      className={cn(
        "relative mx-[var(--primitive-space-2)] mb-[var(--primitive-space-2)] w-[calc(100%-var(--primitive-space-4))] rounded-[var(--primitive-radius-md)] border px-[var(--primitive-space-3)] py-[var(--primitive-space-3)] text-start transition-all duration-[var(--primitive-motion-duration-fast)]",
        focusVisibleStyles,
        selected
          ? "border-[var(--primitive-color-brand-300)] bg-[var(--primitive-color-brand-50)] shadow-[var(--primitive-elevation-1)] ring-1 ring-[var(--primitive-color-brand-200)]"
          : "border-[var(--semantic-color-surface-border)]/80 bg-[var(--semantic-color-surface-card)] hover:border-[var(--primitive-color-brand-200)] hover:shadow-[var(--primitive-elevation-1)]",
        overdue && !selected && "border-[var(--semantic-color-status-danger)]/25",
      )}
    >
      {overdue ? (
        <span
          className="absolute inset-y-2 start-0 w-1 rounded-full bg-[var(--semantic-color-status-danger)]"
          aria-hidden
        />
      ) : null}
      <div className="flex items-start justify-between gap-[var(--primitive-space-3)]">
        <div className="min-w-0 flex-1 ps-1">
          <div className="mb-[var(--primitive-space-1)] flex flex-wrap items-center gap-[var(--primitive-space-2)]">
            <span
              className={cn(
                "inline-flex rounded-[var(--primitive-radius-sm)] border px-[var(--primitive-space-2)] py-px text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)]",
                taskTypePillClassName(task.type, overdue),
              )}
            >
              {TASK_TYPE_LABELS[task.type]}
            </span>
            {task.status !== "open" ? (
              <StatusBadge domain="task" value={task.status} />
            ) : null}
          </div>
          <p className="truncate text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
            {task.title}
          </p>
          <p className="mt-0.5 truncate text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
            {personName}
            {personPhone ? (
              <span dir="ltr" className="text-[var(--semantic-color-text-disabled)]">
                {" "}
                · {formatPhoneDisplay(personPhone)}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-[var(--primitive-space-1)]">
          <span
            className={cn(
              "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-semibold)]",
              overdue
                ? "text-[var(--semantic-color-status-danger)]"
                : "text-[var(--semantic-color-text-primary)]",
            )}
          >
            {relativeDue}
          </span>
          <span className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-disabled)]">
            {absoluteDue}
          </span>
          {assigneeName ? (
            <Avatar name={assigneeName} size="xs" className="mt-0.5" />
          ) : (
            <span className="mt-0.5 text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-disabled)]">
              —
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export { TaskQueueRow };
