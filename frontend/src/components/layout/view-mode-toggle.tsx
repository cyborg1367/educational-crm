"use client";

import * as React from "react";
import { LayoutGrid, Table2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type ListViewMode = "cards" | "table";

/**
 * Persisted cards/table preference for list pages. Reads localStorage after
 * mount (SSR-safe) and writes it back on change.
 */
export function useListViewMode(
  storageKey: string,
  defaultMode: ListViewMode = "cards",
): [ListViewMode, (mode: ListViewMode) => void] {
  const [viewMode, setViewMode] = React.useState<ListViewMode>(defaultMode);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "cards" || stored === "table") {
      setViewMode(stored);
    }
  }, [storageKey]);

  const changeViewMode = React.useCallback(
    (mode: ListViewMode) => {
      setViewMode(mode);
      window.localStorage.setItem(storageKey, mode);
    },
    [storageKey],
  );

  return [viewMode, changeViewMode];
}

export type ViewModeToggleProps = {
  value: ListViewMode;
  onChange: (mode: ListViewMode) => void;
  className?: string;
};

const MODES = [
  { mode: "cards" as const, icon: LayoutGrid, label: "کارت" },
  { mode: "table" as const, icon: Table2, label: "جدول" },
];

function ViewModeToggle({ value, onChange, className }: ViewModeToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-[var(--primitive-radius-full)] border border-[var(--semantic-color-surface-border)]",
        "bg-[var(--semantic-color-surface-card)] p-0.5 shadow-[var(--primitive-elevation-1)]",
        className,
      )}
      role="group"
      aria-label="نوع نمایش"
    >
      {MODES.map(({ mode, icon: Icon, label }) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-[var(--primitive-space-1)] rounded-[var(--primitive-radius-full)]",
              "px-[var(--primitive-space-3)] py-[var(--primitive-space-2)]",
              "text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)]",
              "transition-colors duration-150",
              active
                ? "bg-[var(--semantic-color-action-primary)] text-[var(--semantic-color-text-inverse)]"
                : "text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)]",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export { ViewModeToggle };
