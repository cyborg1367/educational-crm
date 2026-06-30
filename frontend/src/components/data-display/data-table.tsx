"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/primitives/spinner";
import { focusVisibleStyles } from "@/components/form/control-styles";
import { formatCount } from "@/lib/locale/number";
import { cn } from "@/lib/utils";

import type { PaginatedResponse } from "./types";

const iconMirrorRtl = "scale-x-[-1]";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  align?: "start" | "end";
  sortable?: boolean;
};

export type DataTableWidgetMode = {
  rowCap: number;
  viewAllHref?: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: PaginatedResponse<T>;
  loading?: boolean;
  onPageChange?: (offset: number) => void;
  rowSelectable?: boolean;
  getRowId?: (row: T) => string;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  widgetMode?: DataTableWidgetMode;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSortChange?: (column: string, direction: "asc" | "desc") => void;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
};

function defaultGetRowId<T>(row: T): string {
  const record = row as Record<string, unknown>;
  if (typeof record.id === "string" || typeof record.id === "number") {
    return String(record.id);
  }
  return JSON.stringify(row);
}

function defaultCellValue<T>(row: T, key: string): React.ReactNode {
  const value = (row as Record<string, unknown>)[key];
  if (value == null) return "—";
  return String(value);
}

type TableCheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  "aria-label": string;
  disabled?: boolean;
};

function TableCheckbox({
  checked,
  indeterminate = false,
  onChange,
  "aria-label": ariaLabel,
  disabled = false,
}: TableCheckboxProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={inputRef}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={onChange}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "size-[var(--primitive-space-4)] shrink-0 cursor-pointer rounded-[var(--primitive-radius-sm)] border",
        "border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)]",
        "text-[var(--semantic-color-action-primary)] transition-colors",
        "checked:border-[var(--semantic-color-action-primary)] checked:bg-[var(--semantic-color-action-primary)]",
        "hover:border-[var(--primitive-color-neutral-400)]",
        focusVisibleStyles,
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-[var(--semantic-color-surface-border)] disabled:bg-[var(--semantic-color-surface-subtle)]",
      )}
    />
  );
}

function formatPaginationRange(
  offset: number,
  visibleCount: number,
  totalCount: number,
): string {
  if (totalCount === 0) {
    return `${formatCount(0)}–${formatCount(0)} از ${formatCount(0)}`;
  }
  const start = offset + 1;
  const end = Math.min(offset + visibleCount, totalCount);
  return `${formatCount(start)}–${formatCount(end)} از ${formatCount(totalCount)}`;
}

function DataTable<T>({
  columns,
  data,
  loading = false,
  onPageChange,
  rowSelectable = false,
  getRowId = defaultGetRowId,
  selectedIds: selectedIdsProp,
  onSelectedIdsChange,
  widgetMode,
  sortColumn,
  sortDirection = "asc",
  onSortChange,
  emptyMessage = "موردی یافت نشد",
  className,
  onRowClick,
}: DataTableProps<T>) {
  const [internalSelectedIds, setInternalSelectedIds] = React.useState<string[]>(
    [],
  );

  const isSelectionControlled = selectedIdsProp !== undefined;
  const selectedIds = isSelectionControlled ? selectedIdsProp : internalSelectedIds;

  const setSelectedIds = React.useCallback(
    (next: string[]) => {
      if (!isSelectionControlled) {
        setInternalSelectedIds(next);
      }
      onSelectedIdsChange?.(next);
    },
    [isSelectionControlled, onSelectedIdsChange],
  );

  const displayItems = widgetMode
    ? data.items.slice(0, widgetMode.rowCap)
    : data.items;

  const visibleRowIds = displayItems.map(getRowId);
  const allVisibleSelected =
    visibleRowIds.length > 0 &&
    visibleRowIds.every((id) => selectedIds.includes(id));
  const someVisibleSelected =
    visibleRowIds.some((id) => selectedIds.includes(id)) && !allVisibleSelected;

  const toggleRow = (rowId: string) => {
    setSelectedIds(
      selectedIds.includes(rowId)
        ? selectedIds.filter((id) => id !== rowId)
        : [...selectedIds, rowId],
    );
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds(selectedIds.filter((id) => !visibleRowIds.includes(id)));
      return;
    }
    const merged = new Set([...selectedIds, ...visibleRowIds]);
    setSelectedIds([...merged]);
  };

  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSortChange) return;
    const isActive = sortColumn === column.key;
    const nextDirection =
      isActive && sortDirection === "asc" ? "desc" : "asc";
    onSortChange(column.key, nextDirection);
  };

  const showPagination = !widgetMode && onPageChange;
  const canGoPrev = data.offset > 0;
  const canGoNext = data.has_more;

  const skeletonRowCount = widgetMode?.rowCap ?? Math.min(data.limit, 5);

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "overflow-x-auto rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)]",
          "bg-[var(--semantic-color-surface-card)]",
        )}
      >
        <table className="w-full min-w-full border-collapse text-start">
          <thead>
            <tr className="border-b border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)]">
              {rowSelectable ? (
                <th
                  scope="col"
                  className="w-[var(--primitive-space-10)] px-[var(--primitive-space-3)] py-[var(--primitive-space-2)]"
                >
                  <TableCheckbox
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    onChange={toggleAllVisible}
                    aria-label="انتخاب همه"
                    disabled={loading || displayItems.length === 0}
                  />
                </th>
              ) : null}
              {columns.map((column) => {
                const isSorted = sortColumn === column.key;
                const alignClass =
                  column.align === "end" ? "text-end" : "text-start";

                if (column.sortable && onSortChange) {
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      className={cn(
                        "px-[var(--primitive-space-4)] py-[var(--primitive-space-3)]",
                        "text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)]",
                        "text-[var(--semantic-color-text-secondary)]",
                        alignClass,
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort(column)}
                        className={cn(
                          "inline-flex min-h-[var(--primitive-space-10)] items-center gap-[var(--primitive-space-1)]",
                          "rounded-[var(--primitive-radius-sm)] px-[var(--primitive-space-1)] transition-colors",
                          "hover:bg-[var(--primitive-color-neutral-100)]",
                          "active:bg-[var(--primitive-color-neutral-200)]",
                          focusVisibleStyles,
                          isSorted
                            ? "text-[var(--semantic-color-text-primary)]"
                            : undefined,
                        )}
                      >
                        <span>{column.header}</span>
                        {isSorted ? (
                          sortDirection === "asc" ? (
                            <ArrowUp
                              className="size-[var(--primitive-space-4)] shrink-0"
                              aria-hidden
                            />
                          ) : (
                            <ArrowDown
                              className="size-[var(--primitive-space-4)] shrink-0"
                              aria-hidden
                            />
                          )
                        ) : null}
                      </button>
                    </th>
                  );
                }

                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      "px-[var(--primitive-space-4)] py-[var(--primitive-space-3)]",
                      "text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)]",
                      "text-[var(--semantic-color-text-secondary)]",
                      alignClass,
                    )}
                  >
                    {column.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
                <tr
                  key={`skeleton-${rowIndex}`}
                  className="border-b border-[var(--semantic-color-surface-border)] last:border-b-0"
                >
                  {rowSelectable ? (
                    <td className="px-[var(--primitive-space-3)] py-[var(--primitive-space-3)]">
                      <div className="size-[var(--primitive-space-4)] animate-pulse rounded-[var(--primitive-radius-sm)] bg-[var(--semantic-color-surface-subtle)]" />
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-[var(--primitive-space-4)] py-[var(--primitive-space-3)]"
                    >
                      <div
                        className={cn(
                          "h-[var(--primitive-space-4)] animate-pulse rounded-[var(--primitive-radius-sm)] bg-[var(--semantic-color-surface-subtle)]",
                          column.align === "end" ? "ms-auto w-3/4" : "w-full",
                        )}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : displayItems.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (rowSelectable ? 1 : 0)}
                  className="px-[var(--primitive-space-4)] py-[var(--primitive-space-8)] text-center text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              displayItems.map((row) => {
                const rowId = getRowId(row);
                const isSelected = selectedIds.includes(rowId);
                const isClickable = Boolean(onRowClick);

                return (
                  <tr
                    key={rowId}
                    onClick={isClickable ? () => onRowClick?.(row) : undefined}
                    className={cn(
                      "border-b border-[var(--semantic-color-surface-border)] last:border-b-0 transition-colors",
                      "hover:bg-[var(--primitive-color-neutral-50)]",
                      isClickable && "cursor-pointer",
                      isSelected && "bg-[var(--primitive-color-brand-50)]",
                    )}
                  >
                    {rowSelectable ? (
                      <td className="px-[var(--primitive-space-3)] py-[var(--primitive-space-3)]">
                        <TableCheckbox
                          checked={isSelected}
                          onChange={() => toggleRow(rowId)}
                          aria-label="انتخاب ردیف"
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          "px-[var(--primitive-space-4)] py-[var(--primitive-space-3)]",
                          "text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)]",
                          "text-[var(--semantic-color-text-primary)]",
                          column.align === "end" ? "text-end" : "text-start",
                        )}
                      >
                        {column.cell
                          ? column.cell(row)
                          : defaultCellValue(row, column.key)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {widgetMode ? (
        <div className="mt-[var(--primitive-space-3)] flex justify-end">
          {widgetMode.viewAllHref ? (
            <a
              href={widgetMode.viewAllHref}
              className={cn(
                "inline-flex min-h-[var(--primitive-space-10)] items-center text-[length:var(--primitive-font-size-sm)]",
                "text-[var(--semantic-color-text-link)] transition-colors",
                "hover:text-[var(--primitive-color-brand-800)]",
                "active:text-[var(--primitive-color-brand-900)]",
                focusVisibleStyles,
              )}
            >
              {widgetMode.viewAllLabel ?? "مشاهده همه"}
            </a>
          ) : (
            <button
              type="button"
              onClick={widgetMode.onViewAll}
              className={cn(
                "inline-flex min-h-[var(--primitive-space-10)] items-center text-[length:var(--primitive-font-size-sm)]",
                "text-[var(--semantic-color-text-link)] transition-colors",
                "hover:text-[var(--primitive-color-brand-800)]",
                "active:text-[var(--primitive-color-brand-900)]",
                focusVisibleStyles,
              )}
            >
              {widgetMode.viewAllLabel ?? "مشاهده همه"}
            </button>
          )}
        </div>
      ) : showPagination ? (
        <div className="mt-[var(--primitive-space-4)] flex flex-wrap items-center justify-between gap-[var(--primitive-space-3)]">
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            {loading ? (
              <span className="inline-flex items-center gap-[var(--primitive-space-2)]">
                <Spinner size="sm" />
                <span className="sr-only">در حال بارگذاری</span>
              </span>
            ) : (
              formatPaginationRange(
                data.offset,
                displayItems.length,
                data.total_count,
              )
            )}
          </p>
          <div className="flex items-center gap-[var(--primitive-space-2)]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canGoPrev || loading}
              onClick={() => onPageChange(data.offset - data.limit)}
              aria-label="صفحه قبل"
            >
              <ChevronLeft className={iconMirrorRtl} aria-hidden />
              قبلی
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canGoNext || loading}
              onClick={() => onPageChange(data.offset + data.limit)}
              aria-label="صفحه بعد"
            >
              بعدی
              <ChevronRight className={iconMirrorRtl} aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { DataTable };
