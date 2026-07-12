"use client";

import * as React from "react";
import { CheckSquare } from "lucide-react";

import { TaskQueueRow } from "@/components/domain/task-queue-row";
import { EmptyState } from "@/components/feedback";
import type { ConsultationRead, TaskRead } from "@/lib/api/types";
import { formatDateDisplay } from "@/lib/locale/date";
import { formatPhoneDisplay } from "@/lib/locale/number";
import { assessmentStatusLabel } from "@/lib/consultation/assessment";
import { groupTasksByDueBucket } from "@/lib/task/queue";
import { focusVisibleStyles } from "@/components/form/control-styles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ReferralQueueItem = ConsultationRead & {
  person_name: string;
  person_phone?: string | null;
  department_name: string;
};

export type TaskQueueListProps = {
  tasks: TaskRead[];
  today: string;
  selectedTaskId: number | null;
  peopleNames: Map<number, string>;
  peoplePhones?: Map<number, string | null>;
  assigneeNames: Map<number, string>;
  onSelectTask: (taskId: number) => void;
  loading?: boolean;
  referrals?: ReferralQueueItem[];
  onOpenReferral?: (consultation: ReferralQueueItem) => void;
  className?: string;
};

function TaskQueueList({
  tasks,
  today,
  selectedTaskId,
  peopleNames,
  peoplePhones,
  assigneeNames,
  onSelectTask,
  loading = false,
  referrals = [],
  onOpenReferral,
  className,
}: TaskQueueListProps) {
  const groups = React.useMemo(
    () => groupTasksByDueBucket(tasks, today),
    [tasks, today],
  );

  if (loading) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-[var(--primitive-radius-lg)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] shadow-[var(--primitive-elevation-1)]",
          className,
        )}
      >
        <div className="space-y-[var(--primitive-space-3)] p-[var(--primitive-space-4)]">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-[var(--primitive-radius-md)] bg-[var(--semantic-color-surface-subtle)]"
            />
          ))}
        </div>
      </div>
    );
  }

  const empty =
    tasks.length === 0 && referrals.length === 0 ? (
      <EmptyState icon={CheckSquare} message="وظیفه‌ای در این صف نیست" />
    ) : null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--primitive-radius-lg)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)]/40 shadow-[var(--primitive-elevation-1)]",
        className,
      )}
    >
      {referrals.length > 0 ? (
        <section className="border-b border-[var(--semantic-color-surface-border)]">
          <div className="flex items-center justify-between gap-[var(--primitive-space-2)] bg-[var(--semantic-color-surface-subtle)]/80 px-[var(--primitive-space-3)] py-[var(--primitive-space-2)]">
            <h3 className="text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-semibold)] tracking-wide text-[var(--semantic-color-text-secondary)]">
              ارجاع مشاوره
            </h3>
            <span className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-disabled)]">
              {referrals.length}
            </span>
          </div>
          <ul className="divide-y divide-[var(--semantic-color-surface-border)]/80">
            {referrals.map((row) => (
              <li key={`referral-${row.id}`}>
                <div className="flex items-start justify-between gap-[var(--primitive-space-3)] px-[var(--primitive-space-3)] py-[var(--primitive-space-3)]">
                  <button
                    type="button"
                    className={cn(
                      "min-w-0 flex-1 rounded-[var(--primitive-radius-sm)] text-start",
                      focusVisibleStyles,
                    )}
                    onClick={() => onOpenReferral?.(row)}
                  >
                    <p className="truncate text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
                      {row.person_name}
                    </p>
                    <p className="mt-0.5 truncate text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                      {row.department_name} · {assessmentStatusLabel(row)}
                      {row.person_phone ? (
                        <span dir="ltr" className="text-[var(--semantic-color-text-disabled)]">
                          {" "}
                          · {formatPhoneDisplay(row.person_phone)}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-disabled)]">
                      {formatDateDisplay(row.created_at.slice(0, 10))}
                    </p>
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onOpenReferral?.(row)}
                  >
                    ادامه مشاوره
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {empty}

      {groups.map((group) => (
        <section key={group.bucket} className="pb-[var(--primitive-space-1)]">
          <div className="sticky top-0 z-[1] flex items-center justify-between gap-[var(--primitive-space-2)] bg-[var(--semantic-color-surface-subtle)]/95 px-[var(--primitive-space-3)] py-[var(--primitive-space-2)] backdrop-blur-sm">
            <h3
              className={cn(
                "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-semibold)] tracking-wide",
                group.bucket === "overdue"
                  ? "text-[var(--semantic-color-status-danger)]"
                  : "text-[var(--semantic-color-text-secondary)]",
              )}
            >
              {group.label}
            </h3>
            <span className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-disabled)]">
              {group.items.length}
            </span>
          </div>
          <ul className="pt-[var(--primitive-space-1)]">
            {group.items.map((task) => (
              <li key={task.id}>
                <TaskQueueRow
                  task={task}
                  today={today}
                  personName={
                    peopleNames.get(task.person_id) ?? `#${task.person_id}`
                  }
                  personPhone={peoplePhones?.get(task.person_id)}
                  assigneeName={
                    task.assignee_id
                      ? (assigneeNames.get(task.assignee_id) ?? null)
                      : null
                  }
                  selected={selectedTaskId === task.id}
                  onSelect={onSelectTask}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export { TaskQueueList };
