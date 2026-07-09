"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { TaskViewChips } from "@/components/domain/task-priority-chips";
import { focusVisibleStyles } from "@/components/form/control-styles";
import { Select } from "@/components/form/select";
import { TextInput } from "@/components/form/text-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TaskRead, TaskStatus, TaskType, UserRead } from "@/lib/api/types";
import { formatCount } from "@/lib/locale/number";
import {
  countSecondaryFilterActive,
  countViewChips,
  DEFAULT_TASK_SECONDARY_FILTERS,
  hasSecondaryFilters,
  TASK_VIEW_CHIP_LABELS,
  type TaskSecondaryFilters,
  type TaskViewChipId,
} from "@/lib/task/queue";
import { TASK_TYPE_LABELS, terminologyLabel } from "@/lib/terminology";
import { cn } from "@/lib/utils";

export type TaskInboxToolbarProps = {
  tasks: TaskRead[];
  today: string;
  viewChip: TaskViewChipId;
  onViewChipChange: (chip: TaskViewChipId) => void;
  secondaryFilters: TaskSecondaryFilters;
  onSecondaryFiltersChange: (filters: TaskSecondaryFilters) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onResetAll: () => void;
  showAssigneeFilter?: boolean;
  users?: UserRead[];
  className?: string;
};

type ActiveFilterTag = {
  id: string;
  label: string;
  onRemove: () => void;
};

function buildActiveFilterTags(
  filters: TaskSecondaryFilters,
  viewChip: TaskViewChipId,
  searchQuery: string,
  usersById: Map<number, UserRead>,
  onChange: (filters: TaskSecondaryFilters) => void,
  onViewChipChange: (chip: TaskViewChipId) => void,
  onSearchQueryChange: (query: string) => void,
): ActiveFilterTag[] {
  const tags: ActiveFilterTag[] = [];

  if (viewChip !== "open") {
    tags.push({
      id: `view-${viewChip}`,
      label: TASK_VIEW_CHIP_LABELS[viewChip],
      onRemove: () => onViewChipChange("open"),
    });
  }

  if (searchQuery.trim()) {
    tags.push({
      id: "search",
      label: `جستجو: ${searchQuery.trim()}`,
      onRemove: () => onSearchQueryChange(""),
    });
  }

  for (const type of filters.types) {
    tags.push({
      id: `type-${type}`,
      label: TASK_TYPE_LABELS[type],
      onRemove: () =>
        onChange({
          ...filters,
          types: filters.types.filter((value) => value !== type),
        }),
    });
  }

  if (filters.assigneeId === "unassigned") {
    tags.push({
      id: "assignee-unassigned",
      label: "بدون مسئول",
      onRemove: () => onChange({ ...filters, assigneeId: null }),
    });
  } else if (filters.assigneeId) {
    const user = usersById.get(Number(filters.assigneeId));
    tags.push({
      id: `assignee-${filters.assigneeId}`,
      label: user?.name ?? `مسئول #${filters.assigneeId}`,
      onRemove: () => onChange({ ...filters, assigneeId: null }),
    });
  }

  if (filters.status !== "open") {
    const statusLabel =
      filters.status === "all"
        ? "همه وضعیت‌ها"
        : terminologyLabel(filters.status);
    tags.push({
      id: `status-${filters.status}`,
      label: statusLabel,
      onRemove: () => onChange({ ...filters, status: "open" }),
    });
  }

  return tags;
}

function TaskInboxToolbar({
  tasks,
  today,
  viewChip,
  onViewChipChange,
  secondaryFilters,
  onSecondaryFiltersChange,
  searchQuery,
  onSearchQueryChange,
  onResetAll,
  showAssigneeFilter = false,
  users = [],
  className,
}: TaskInboxToolbarProps) {
  const [filterOpen, setFilterOpen] = React.useState(false);
  const viewCounts = React.useMemo(
    () => countViewChips(tasks, today),
    [tasks, today],
  );
  const secondaryCount = countSecondaryFilterActive(secondaryFilters);
  const usersById = React.useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );
  const activeTags = buildActiveFilterTags(
    secondaryFilters,
    viewChip,
    searchQuery,
    usersById,
    onSecondaryFiltersChange,
    onViewChipChange,
    onSearchQueryChange,
  );
  const hasActiveFilters =
    activeTags.length > 0 || secondaryCount > 0 || searchQuery.trim().length > 0;

  const toggleType = (type: TaskType) => {
    const next = secondaryFilters.types.includes(type)
      ? secondaryFilters.types.filter((value) => value !== type)
      : [...secondaryFilters.types, type];
    onSecondaryFiltersChange({ ...secondaryFilters, types: next });
  };

  const handleClearSecondary = () => {
    onSecondaryFiltersChange(DEFAULT_TASK_SECONDARY_FILTERS);
  };

  const filterSectionClassName =
    "space-y-[var(--primitive-space-3)] border-t border-[var(--semantic-color-surface-border)]/80 pt-[var(--primitive-space-4)] first:border-t-0 first:pt-0";

  const filterFieldLabelClassName =
    "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-semibold)] tracking-wide text-[var(--semantic-color-text-secondary)]";

  return (
    <div
      className={cn(
        "rounded-[var(--primitive-radius-lg)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] p-[var(--primitive-space-3)] shadow-[var(--primitive-elevation-1)]",
        className,
      )}
    >
      <div className="flex flex-col gap-[var(--primitive-space-3)]">
        <div className="flex flex-wrap items-center gap-[var(--primitive-space-2)]">
          <TaskViewChips
            counts={viewCounts}
            active={viewChip}
            onChange={onViewChipChange}
            className="min-w-0 flex-1"
          />

          <div className="relative w-full min-w-[10rem] flex-1 sm:max-w-[14rem]">
            <Search className="pointer-events-none absolute start-[var(--primitive-space-3)] top-1/2 size-3.5 -translate-y-1/2 text-[var(--semantic-color-text-disabled)]" />
            <TextInput
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="جستجو در عنوان یا شخص…"
              className="ps-9"
              inputSize="md"
            />
          </div>

          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex shrink-0 items-center gap-[var(--primitive-space-2)] rounded-[var(--primitive-radius-md)] border px-[var(--primitive-space-3)] py-1.5",
                  "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)]",
                  "border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] text-[var(--semantic-color-text-secondary)]",
                  "hover:border-[var(--primitive-color-brand-200)] hover:text-[var(--semantic-color-text-primary)]",
                  secondaryCount > 0 &&
                    "border-[var(--primitive-color-brand-300)] text-[var(--primitive-color-brand-800)]",
                  focusVisibleStyles,
                )}
              >
                <SlidersHorizontal className="size-3.5" aria-hidden />
                <span>فیلتر</span>
                {secondaryCount > 0 ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-[var(--primitive-color-brand-100)] text-[length:var(--primitive-font-size-xs)] tabular-nums text-[var(--primitive-color-brand-800)]">
                    {formatCount(secondaryCount)}
                  </span>
                ) : null}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-[min(100vw-2rem,22rem)] overflow-hidden p-0 shadow-[var(--primitive-elevation-2)]"
            >
              <div className="border-b border-[var(--semantic-color-surface-border)] bg-[color-mix(in_srgb,var(--semantic-color-surface-subtle)_55%,var(--semantic-color-surface-card))] px-[var(--primitive-space-4)] py-[var(--primitive-space-3)]">
                <div className="flex items-start justify-between gap-[var(--primitive-space-3)]">
                  <div>
                    <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
                      فیلتر وظایف
                    </h3>
                    <p className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-xs)] leading-relaxed text-[var(--semantic-color-text-secondary)]">
                      نوع، مسئول و وضعیت را محدود کنید
                    </p>
                  </div>
                  {hasSecondaryFilters(secondaryFilters) ? (
                    <button
                      type="button"
                      onClick={handleClearSecondary}
                      className={cn(
                        "shrink-0 rounded-[var(--primitive-radius-sm)] px-[var(--primitive-space-2)] py-1",
                        "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-[var(--primitive-color-brand-700)]",
                        "hover:bg-[var(--primitive-color-brand-50)]",
                        focusVisibleStyles,
                      )}
                    >
                      پاک کردن
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="max-h-[min(70vh,22rem)] overflow-y-auto px-[var(--primitive-space-4)] py-[var(--primitive-space-4)]">
                <section className={filterSectionClassName}>
                  <p className={filterFieldLabelClassName}>نوع وظیفه</p>
                  <div className="flex flex-wrap gap-[var(--primitive-space-2)]">
                    {(Object.keys(TASK_TYPE_LABELS) as TaskType[]).map(
                      (type) => {
                        const selected = secondaryFilters.types.includes(type);
                        return (
                          <button
                            key={type}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleType(type)}
                            className={cn(
                              "rounded-[var(--primitive-radius-md)] border px-[var(--primitive-space-3)] py-[var(--primitive-space-2)]",
                              "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] transition-colors",
                              focusVisibleStyles,
                              selected
                                ? "border-[var(--primitive-color-brand-300)] bg-[var(--primitive-color-brand-50)] text-[var(--primitive-color-brand-800)] shadow-[var(--primitive-elevation-1)]"
                                : "border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] text-[var(--semantic-color-text-secondary)] hover:border-[var(--primitive-color-brand-200)] hover:text-[var(--semantic-color-text-primary)]",
                            )}
                          >
                            {TASK_TYPE_LABELS[type]}
                          </button>
                        );
                      },
                    )}
                  </div>
                </section>

                {showAssigneeFilter ? (
                  <section className={filterSectionClassName}>
                    <label className={filterFieldLabelClassName}>مسئول</label>
                    <Select
                      options={[
                        { value: "", label: "همه" },
                        { value: "unassigned", label: "بدون مسئول" },
                        ...users.map((user) => ({
                          value: String(user.id),
                          label: user.name,
                        })),
                      ]}
                      value={secondaryFilters.assigneeId ?? ""}
                      onChange={(value) =>
                        onSecondaryFiltersChange({
                          ...secondaryFilters,
                          assigneeId: value || null,
                        })
                      }
                      placeholder="همه"
                    />
                  </section>
                ) : null}

                <section className={filterSectionClassName}>
                  <label className={filterFieldLabelClassName}>وضعیت</label>
                  <Select
                    options={[
                      { value: "open", label: terminologyLabel("open") },
                      { value: "done", label: terminologyLabel("done") },
                      {
                        value: "cancelled",
                        label: terminologyLabel("cancelled"),
                      },
                      { value: "all", label: "همه وضعیت‌ها" },
                    ]}
                    value={secondaryFilters.status}
                    onChange={(value) =>
                      onSecondaryFiltersChange({
                        ...secondaryFilters,
                        status: value as TaskStatus | "all",
                      })
                    }
                  />
                </section>
              </div>

              <div className="flex justify-end border-t border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)]/50 px-[var(--primitive-space-4)] py-[var(--primitive-space-3)]">
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className={cn(
                    "rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] px-[var(--primitive-space-4)] py-[var(--primitive-space-2)]",
                    "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]",
                    "hover:border-[var(--primitive-color-brand-200)] hover:bg-[var(--primitive-color-brand-50)]",
                    focusVisibleStyles,
                  )}
                >
                  بستن
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-[var(--primitive-space-2)] rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)]/80 bg-[var(--semantic-color-surface-subtle)]/60 px-[var(--primitive-space-3)] py-[var(--primitive-space-2)]">
            <span className="text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-secondary)]">
              فیلتر فعال
            </span>
            {activeTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={tag.onRemove}
                className={cn(
                  "inline-flex items-center gap-[var(--primitive-space-1)] rounded-[var(--primitive-radius-sm)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] px-[var(--primitive-space-2)] py-1",
                  "text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)] shadow-[var(--primitive-elevation-1)] hover:border-[var(--primitive-color-brand-200)] hover:text-[var(--semantic-color-text-primary)]",
                  focusVisibleStyles,
                )}
              >
                <span>{tag.label}</span>
                <X className="size-3" aria-hidden />
              </button>
            ))}
            <button
              type="button"
              onClick={onResetAll}
              className={cn(
                "text-[length:var(--primitive-font-size-xs)] text-[var(--primitive-color-brand-700)] hover:underline",
                focusVisibleStyles,
              )}
            >
              پاک کردن همه
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { TaskInboxToolbar };
