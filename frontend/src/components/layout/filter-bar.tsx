"use client";

import * as React from "react";
import { Bookmark } from "lucide-react";

import { DatePicker } from "@/components/form/date-picker";
import { Select, type SelectOption } from "@/components/form/select";
import { TextInput } from "@/components/form/text-input";
import { Checkbox } from "@/components/form/selection-control";
import { focusVisibleStyles } from "@/components/form/control-styles";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { StorageDate } from "@/lib/locale/date";
import { cn } from "@/lib/utils";

export type FacetSelectConfig = {
  id: string;
  type: "select";
  label: string;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
};

export type FacetMultiSelectConfig = {
  id: string;
  type: "multi";
  label: string;
  options: SelectOption[];
};

export type FacetDateRangeConfig = {
  id: string;
  type: "date-range";
  label: string;
  fromLabel?: string;
  toLabel?: string;
};

export type FacetSearchConfig = {
  id: string;
  type: "search";
  label: string;
  placeholder?: string;
};

export type FacetConfig =
  | FacetSelectConfig
  | FacetMultiSelectConfig
  | FacetDateRangeConfig
  | FacetSearchConfig;

export type SavedView = {
  id: string;
  label: string;
  /** Preset facet values — persisted by screen capsules (F09+). */
  values: FilterValues;
};

export type FilterValues = Record<
  string,
  string | string[] | { from?: StorageDate; to?: StorageDate } | undefined
>;

export type FilterBarProps = {
  facets: FacetConfig[];
  values: FilterValues;
  onValuesChange: (values: FilterValues) => void;
  savedViews?: SavedView[];
  activeSavedViewId?: string | null;
  onSavedViewSelect?: (viewId: string | null) => void;
  onSaveCurrentView?: () => void;
  className?: string;
};

function updateValue(
  values: FilterValues,
  facetId: string,
  next: FilterValues[string],
): FilterValues {
  return { ...values, [facetId]: next };
}

function SavedViewsDropdown({
  savedViews,
  activeSavedViewId,
  onSavedViewSelect,
}: Pick<
  FilterBarProps,
  "savedViews" | "activeSavedViewId" | "onSavedViewSelect"
>) {
  const [open, setOpen] = React.useState(false);
  const activeView = savedViews?.find((view) => view.id === activeSavedViewId);

  if (!savedViews || savedViews.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-[var(--primitive-space-10)] items-center gap-[var(--primitive-space-2)] rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] px-[var(--primitive-space-3)]",
            "text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-primary)]",
            "hover:bg-[var(--primitive-color-neutral-50)] active:bg-[var(--primitive-color-neutral-100)]",
            focusVisibleStyles,
          )}
        >
          <Bookmark className="size-[var(--primitive-space-4)] shrink-0" aria-hidden />
          <span>{activeView?.label ?? "نمای ذخیره‌شده"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-[var(--primitive-space-2)]">
        <ul>
          <li>
            <button
              type="button"
              className={cn(
                "w-full rounded-[var(--primitive-radius-sm)] px-[var(--primitive-space-3)] py-[var(--primitive-space-2)] text-start text-[length:var(--primitive-font-size-sm)]",
                "hover:bg-[var(--primitive-color-neutral-100)]",
                focusVisibleStyles,
                !activeSavedViewId &&
                  "bg-[var(--primitive-color-brand-50)] font-[var(--primitive-font-weight-medium)]",
              )}
              onClick={() => {
                onSavedViewSelect?.(null);
                setOpen(false);
              }}
            >
              پیش‌فرض
            </button>
          </li>
          {savedViews.map((view) => (
            <li key={view.id}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-[var(--primitive-radius-sm)] px-[var(--primitive-space-3)] py-[var(--primitive-space-2)] text-start text-[length:var(--primitive-font-size-sm)]",
                  "hover:bg-[var(--primitive-color-neutral-100)]",
                  focusVisibleStyles,
                  activeSavedViewId === view.id &&
                    "bg-[var(--primitive-color-brand-50)] font-[var(--primitive-font-weight-medium)]",
                )}
                onClick={() => {
                  onSavedViewSelect?.(view.id);
                  setOpen(false);
                }}
              >
                {view.label}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function FacetField({
  facet,
  values,
  onValuesChange,
}: {
  facet: FacetConfig;
  values: FilterValues;
  onValuesChange: (values: FilterValues) => void;
}) {
  if (facet.type === "search") {
    const value = values[facet.id];
    return (
      <div className="min-w-[12rem] flex-1 sm:max-w-[20rem]">
        <label className="mb-[var(--primitive-space-1)] block text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-secondary)]">
          {facet.label}
        </label>
        <TextInput
          value={typeof value === "string" ? value : ""}
          onChange={(event) =>
            onValuesChange(updateValue(values, facet.id, event.target.value))
          }
          placeholder={facet.placeholder}
        />
      </div>
    );
  }

  if (facet.type === "select") {
    const value = values[facet.id];
    return (
      <div className="min-w-[10rem] flex-1 sm:max-w-[14rem]">
        <label className="mb-[var(--primitive-space-1)] block text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-secondary)]">
          {facet.label}
        </label>
        <Select
          options={facet.options}
          value={typeof value === "string" ? value : undefined}
          onChange={(next) =>
            onValuesChange(updateValue(values, facet.id, next))
          }
          placeholder={facet.placeholder ?? "همه"}
          searchable={facet.searchable}
        />
      </div>
    );
  }

  if (facet.type === "multi") {
    const selected = Array.isArray(values[facet.id])
      ? (values[facet.id] as string[])
      : [];

    return (
      <fieldset className="min-w-0 flex-1">
        <legend className="mb-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-secondary)]">
          {facet.label}
        </legend>
        <div className="flex flex-wrap gap-[var(--primitive-space-3)]">
          {facet.options.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <Checkbox
                key={option.value}
                label={option.label}
                checked={checked}
                disabled={option.disabled}
                onChange={(event) => {
                  const nextSelected = event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((value) => value !== option.value);
                  onValuesChange(
                    updateValue(values, facet.id, nextSelected),
                  );
                }}
              />
            );
          })}
        </div>
      </fieldset>
    );
  }

  const range = (values[facet.id] as { from?: StorageDate; to?: StorageDate }) ?? {
    from: undefined,
    to: undefined,
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[var(--primitive-space-2)] sm:flex-row sm:items-end">
      <div className="min-w-[10rem] flex-1 sm:max-w-[12rem]">
        <label className="mb-[var(--primitive-space-1)] block text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-secondary)]">
          {facet.fromLabel ?? `${facet.label} — از`}
        </label>
        <DatePicker
          value={range.from}
          onChange={(from) =>
            onValuesChange(
              updateValue(values, facet.id, {
                ...range,
                from: from ?? undefined,
              }),
            )
          }
        />
      </div>
      <div className="min-w-[10rem] flex-1 sm:max-w-[12rem]">
        <label className="mb-[var(--primitive-space-1)] block text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-secondary)]">
          {facet.toLabel ?? `${facet.label} — تا`}
        </label>
        <DatePicker
          value={range.to}
          onChange={(to) =>
            onValuesChange(
              updateValue(values, facet.id, { ...range, to: to ?? undefined }),
            )
          }
        />
      </div>
    </div>
  );
}

function FilterBar({
  facets,
  values,
  onValuesChange,
  savedViews,
  activeSavedViewId,
  onSavedViewSelect,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[var(--primitive-space-4)] rounded-[var(--primitive-radius-lg)]",
        "border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)]",
        "p-[var(--primitive-space-5)] shadow-[var(--primitive-elevation-1)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-end gap-[var(--primitive-space-4)]">
        {facets.map((facet) => (
          <FacetField
            key={facet.id}
            facet={facet}
            values={values}
            onValuesChange={onValuesChange}
          />
        ))}

        <SavedViewsDropdown
          savedViews={savedViews}
          activeSavedViewId={activeSavedViewId}
          onSavedViewSelect={onSavedViewSelect}
        />
      </div>
    </div>
  );
}

export { FilterBar };
