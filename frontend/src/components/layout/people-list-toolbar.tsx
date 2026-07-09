"use client";

import { LayoutGrid, Plus, Search, Table2 } from "lucide-react";

import { focusVisibleStyles } from "@/components/form/control-styles";
import { Button } from "@/components/ui/button";
import type { PersonStatus } from "@/lib/api/types";
import { STATUS_DISPLAY_LABELS } from "@/lib/terminology";
import { cn } from "@/lib/utils";

export type PeopleListViewMode = "cards" | "table";

const STATUS_CHIPS: { value: PersonStatus | null; label: string }[] = [
  { value: null, label: "همه" },
  { value: "prospect", label: STATUS_DISPLAY_LABELS["person.prospect"]! },
  { value: "lead", label: STATUS_DISPLAY_LABELS["person.lead"]! },
  { value: "student", label: STATUS_DISPLAY_LABELS["person.student"]! },
  { value: "dormant", label: STATUS_DISPLAY_LABELS["person.dormant"]! },
  { value: "alumni", label: STATUS_DISPLAY_LABELS["person.alumni"]! },
];

export type PeopleListToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: PersonStatus | undefined;
  onStatusChange: (status: PersonStatus | undefined) => void;
  viewMode: PeopleListViewMode;
  onViewModeChange: (mode: PeopleListViewMode) => void;
  onAddPerson: () => void;
  className?: string;
};

function PeopleListToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  viewMode,
  onViewModeChange,
  onAddPerson,
  className,
}: PeopleListToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[var(--primitive-space-4)] lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      <div className="relative min-w-0 flex-1 lg:max-w-sm">
        <Search
          className="pointer-events-none absolute start-[var(--primitive-space-3)] top-1/2 size-[var(--primitive-space-4)] -translate-y-1/2 text-[var(--semantic-color-text-disabled)]"
          aria-hidden
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="جستجوی نام یا شماره…"
          className={cn(
            "w-full rounded-[var(--primitive-radius-full)] border border-[var(--semantic-color-surface-border)]",
            "bg-[var(--semantic-color-surface-card)] py-[var(--primitive-space-2)]",
            "ps-[var(--primitive-space-10)] pe-[var(--primitive-space-4)]",
            "text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-primary)]",
            "placeholder:text-[var(--semantic-color-text-disabled)]",
            "shadow-[var(--primitive-elevation-1)]",
            "transition-colors duration-[var(--primitive-motion-duration-fast)]",
            "hover:border-[var(--primitive-color-neutral-300)]",
            "focus:border-[var(--primitive-color-brand-400)] focus:outline-none focus:ring-2 focus:ring-[var(--semantic-color-action-focusRing)]/30",
            focusVisibleStyles,
          )}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-[var(--primitive-space-2)] lg:flex-1 lg:justify-center">
        {STATUS_CHIPS.map((chip) => {
          const isActive =
            chip.value === null ? statusFilter === undefined : statusFilter === chip.value;

          return (
            <button
              key={chip.value ?? "all"}
              type="button"
              onClick={() =>
                onStatusChange(chip.value === null ? undefined : chip.value)
              }
              className={cn(
                "shrink-0 rounded-[var(--primitive-radius-full)] px-[var(--primitive-space-4)] py-[var(--primitive-space-2)]",
                "text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)]",
                "transition-all duration-[var(--primitive-motion-duration-fast)]",
                isActive
                  ? "bg-[var(--semantic-color-action-primary)] text-[var(--semantic-color-text-inverse)] shadow-[0_2px_8px_rgba(232,119,34,0.25)]"
                  : "border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] text-[var(--semantic-color-text-primary)] hover:border-[var(--primitive-color-neutral-300)] hover:bg-[var(--semantic-color-surface-subtle)]",
                focusVisibleStyles,
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="flex w-full shrink-0 items-center gap-[var(--primitive-space-2)] lg:w-auto">
        <div
          className={cn(
            "inline-flex rounded-[var(--primitive-radius-full)] border border-[var(--semantic-color-surface-border)]",
            "bg-[var(--semantic-color-surface-card)] p-0.5 shadow-[var(--primitive-elevation-1)]",
          )}
          role="group"
          aria-label="نوع نمایش"
        >
          {(
            [
              { mode: "cards" as const, icon: LayoutGrid, label: "کارت" },
              { mode: "table" as const, icon: Table2, label: "جدول" },
            ] as const
          ).map(({ mode, icon: Icon, label }) => {
            const active = viewMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-[var(--primitive-space-1)] rounded-[var(--primitive-radius-full)]",
                  "px-[var(--primitive-space-3)] py-[var(--primitive-space-2)]",
                  "text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)]",
                  "transition-colors duration-150",
                  active
                    ? "bg-[var(--semantic-color-action-primary)] text-[var(--semantic-color-text-inverse)]"
                    : "text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)]",
                  focusVisibleStyles,
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onAddPerson}
          className="flex-1 shadow-[0_2px_8px_rgba(232,119,34,0.25)] lg:flex-none"
        >
          <Plus className="size-[var(--primitive-space-4)]" aria-hidden />
          فرد جدید
        </Button>
      </div>
    </div>
  );
}

export { PeopleListToolbar };
