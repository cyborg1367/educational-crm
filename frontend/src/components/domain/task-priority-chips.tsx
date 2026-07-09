"use client";

import * as React from "react";

import { focusVisibleStyles } from "@/components/form/control-styles";
import {
  formatChipCount,
  TASK_VIEW_CHIP_LABELS,
  VIEW_CHIP_ORDER,
  type TaskViewChipId,
  type TaskViewCounts,
} from "@/lib/task/queue";
import { cn } from "@/lib/utils";

export type TaskViewChipsProps = {
  counts: TaskViewCounts;
  active: TaskViewChipId;
  onChange: (chip: TaskViewChipId) => void;
  className?: string;
};

function TaskViewChips({
  counts,
  active,
  onChange,
  className,
}: TaskViewChipsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-[var(--primitive-space-2)]",
        className,
      )}
      role="toolbar"
      aria-label="نمای زمانی صف وظایف"
    >
      {VIEW_CHIP_ORDER.map((chip) => {
        const count = counts[chip];
        const isActive = active === chip;
        const urgent = chip === "overdue" && count > 0;
        return (
          <button
            key={chip}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(chip)}
            className={cn(
              "inline-flex items-center gap-[var(--primitive-space-2)] rounded-[var(--primitive-radius-md)] border px-[var(--primitive-space-3)] py-1.5",
              "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] transition-colors duration-[var(--primitive-motion-duration-fast)]",
              focusVisibleStyles,
              isActive
                ? urgent
                  ? "border-[var(--semantic-color-status-danger)]/40 bg-[var(--semantic-color-status-danger)]/10 text-[var(--semantic-color-status-danger)]"
                  : "border-[var(--primitive-color-brand-300)] bg-[var(--primitive-color-brand-50)] text-[var(--primitive-color-brand-800)]"
                : urgent
                  ? "border-[var(--semantic-color-status-danger)]/25 bg-[var(--semantic-color-surface-card)] text-[var(--semantic-color-status-danger)] hover:bg-[var(--semantic-color-status-danger)]/5"
                  : "border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] text-[var(--semantic-color-text-secondary)] hover:border-[var(--primitive-color-brand-200)] hover:text-[var(--semantic-color-text-primary)]",
            )}
          >
            <span>{TASK_VIEW_CHIP_LABELS[chip]}</span>
            <span
              className={cn(
                "min-w-[1.25rem] rounded-[var(--primitive-radius-sm)] px-1.5 py-px text-center tabular-nums",
                isActive
                  ? urgent
                    ? "bg-[var(--semantic-color-status-danger)]/15"
                    : "bg-[var(--primitive-color-brand-100)]"
                  : "bg-[var(--semantic-color-surface-subtle)]",
              )}
            >
              {formatChipCount(count)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** @deprecated Use TaskViewChips */
const TaskPriorityChips = TaskViewChips;

export { TaskViewChips, TaskPriorityChips };
export type TaskPriorityChipsProps = TaskViewChipsProps;
