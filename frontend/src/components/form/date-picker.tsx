"use client";

import * as React from "react";
import { Calendar } from "lucide-react";

import { Select } from "@/components/form/select";
import { TextInput } from "@/components/form/text-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDialogPortalContainer } from "@/components/ui/dialog-portal-context";
import {
  formatDateDisplay,
  toStorageDate,
  type StorageDate,
} from "@/lib/locale/date";
import {
  buildJalaliYearRange,
  buildMonthGrid,
  currentJalaliMonth,
  JALALI_WEEKDAY_LABELS,
  storageToJalaliMonth,
  type JalaliMonth,
} from "@/lib/locale/jalali-month";
import { PERSIAN_MONTHS } from "@/lib/locale/persian-months";
import { toPersianDigits } from "@/lib/locale/number";
import { cn } from "@/lib/utils";

const JALALI_DATE = /^\d{4}\/\d{1,2}\/\d{1,2}$/;

const MONTH_OPTIONS = PERSIAN_MONTHS.map((label, index) => ({
  value: String(index + 1),
  label,
}));

export type DatePickerProps = {
  id?: string;
  value?: StorageDate | null;
  onChange?: (value: StorageDate | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  inputSize?: "md" | "lg";
  className?: string;
  /** Earliest selectable Jalali year in the calendar header (default 1300). */
  minYear?: number;
  /** Latest selectable Jalali year in the calendar header (default current + 10). */
  maxYear?: number;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
};

function DatePicker({
  id,
  value = null,
  onChange,
  placeholder = "۱۴۰۳/۰۶/۱۵",
  disabled = false,
  error = false,
  inputSize = "md",
  className,
  minYear,
  maxYear,
  ...ariaProps
}: DatePickerProps) {
  const currentMonth = currentJalaliMonth();
  const resolvedMinYear = minYear ?? 1300;
  const resolvedMaxYear = maxYear ?? currentMonth.year + 10;
  const portalContainer = useDialogPortalContainer();

  const [open, setOpen] = React.useState(false);
  const [displayValue, setDisplayValue] = React.useState(() =>
    value ? formatDateDisplay(value) : "",
  );
  const [viewMonth, setViewMonth] = React.useState<JalaliMonth>(() =>
    value ? storageToJalaliMonth(value) : currentMonth,
  );

  const yearOptions = React.useMemo(
    () =>
      buildJalaliYearRange(resolvedMinYear, resolvedMaxYear).map((year) => ({
        value: String(year),
        label: toPersianDigits(String(year)),
      })),
    [resolvedMinYear, resolvedMaxYear],
  );

  React.useEffect(() => {
    setDisplayValue(value ? formatDateDisplay(value) : "");
    if (value) {
      setViewMonth(storageToJalaliMonth(value));
    }
  }, [value]);

  const commitDisplayValue = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "") {
      onChange?.(null);
      setDisplayValue("");
      return;
    }
    if (!JALALI_DATE.test(trimmed)) {
      setDisplayValue(value ? formatDateDisplay(value) : "");
      return;
    }
    try {
      const storage = toStorageDate(trimmed);
      onChange?.(storage);
      setDisplayValue(formatDateDisplay(storage));
      setViewMonth(storageToJalaliMonth(storage));
    } catch {
      setDisplayValue(value ? formatDateDisplay(value) : "");
    }
  };

  const handleDaySelect = (storageDate: StorageDate) => {
    onChange?.(storageDate);
    setDisplayValue(formatDateDisplay(storageDate));
    setOpen(false);
  };

  const monthCells = buildMonthGrid(viewMonth);

  return (
    <Popover modal={false} open={open} onOpenChange={setOpen}>
      <div className={cn("relative", className)}>
        <TextInput
          id={id}
          value={displayValue}
          disabled={disabled}
          error={error}
          inputSize={inputSize}
          placeholder={placeholder}
          className="pe-[var(--primitive-space-10)] text-end"
          onChange={(event) => setDisplayValue(event.target.value)}
          onBlur={(event) => commitDisplayValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitDisplayValue(displayValue);
              setOpen(false);
            }
          }}
          {...ariaProps}
        />
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "absolute inset-y-0 end-0 inline-flex w-[var(--primitive-space-10)] items-center justify-center",
              "text-[var(--semantic-color-text-secondary)] transition-colors",
              "hover:text-[var(--semantic-color-text-primary)]",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--semantic-color-action-focusRing)]",
              "disabled:pointer-events-none disabled:text-[var(--semantic-color-text-disabled)]",
            )}
            aria-label="باز کردن تقویم"
          >
            <Calendar className="size-[var(--primitive-space-5)]" />
          </button>
        </PopoverTrigger>
      </div>

      <PopoverContent
        container={portalContainer}
        align="center"
        side="bottom"
        sideOffset={6}
        collisionPadding={16}
        avoidCollisions
        className="w-[min(18rem,calc(100vw-2rem))] p-[var(--primitive-space-3)]"
      >
        <div className="mb-[var(--primitive-space-3)] grid grid-cols-2 gap-[var(--primitive-space-2)]">
          <Select
            searchable
            searchPlaceholder="جستجوی سال…"
            options={yearOptions}
            value={String(viewMonth.year)}
            onChange={(nextYear) =>
              setViewMonth((current) => ({
                ...current,
                year: Number(nextYear),
              }))
            }
            aria-label="سال"
          />
          <Select
            options={MONTH_OPTIONS}
            value={String(viewMonth.month)}
            onChange={(nextMonth) =>
              setViewMonth((current) => ({
                ...current,
                month: Number(nextMonth),
              }))
            }
            aria-label="ماه"
          />
        </div>

        <div className="grid grid-cols-7 gap-[var(--primitive-space-1)] text-center">
          {JALALI_WEEKDAY_LABELS.map((label) => (
            <span
              key={label}
              className="py-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]"
            >
              {label}
            </span>
          ))}
          {monthCells.map((cell, index) =>
            cell ? (
              <button
                key={`${cell.storageDate}-${index}`}
                type="button"
                className={cn(
                  "h-[var(--primitive-space-8)] rounded-[var(--primitive-radius-sm)] text-[length:var(--primitive-font-size-sm)]",
                  "hover:bg-[var(--primitive-color-brand-50)]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--semantic-color-action-focusRing)]",
                  value === cell.storageDate &&
                    "bg-[var(--semantic-color-action-primary)] text-[var(--semantic-color-text-inverse)] hover:bg-[var(--semantic-color-action-primaryHover)]",
                )}
                onClick={() => handleDaySelect(cell.storageDate)}
              >
                {toPersianDigits(String(cell.day))}
              </button>
            ) : (
              <span key={`empty-${index}`} aria-hidden />
            ),
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
