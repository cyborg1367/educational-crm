"use client";

import * as React from "react";
import dayjs from "dayjs";
import jalaliday from "jalaliday";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import { TextInput } from "@/components/form/text-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatDateDisplay,
  toStorageDate,
  type StorageDate,
} from "@/lib/locale/date";
import { toPersianDigits } from "@/lib/locale/number";
import { cn } from "@/lib/utils";

dayjs.extend(jalaliday);

const JALALI_DATE = /^\d{4}\/\d{1,2}\/\d{1,2}$/;
const WEEKDAY_LABELS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

type JalaliMonth = {
  year: number;
  month: number;
};

function storageToJalaliMonth(value: StorageDate): JalaliMonth {
  const jalali = dayjs(value).calendar("jalali");
  return { year: jalali.year(), month: jalali.month() + 1 };
}

function currentJalaliMonth(): JalaliMonth {
  const jalali = dayjs().calendar("jalali");
  return { year: jalali.year(), month: jalali.month() + 1 };
}

function shiftJalaliMonth(
  { year, month }: JalaliMonth,
  delta: number,
): JalaliMonth {
  const anchor = dayjs(
    `${year}/${month}/1`,
    { jalali: true } as dayjs.OptionType,
  ).add(delta, "month");
  const jalali = anchor.calendar("jalali");
  return { year: jalali.year(), month: jalali.month() + 1 };
}

function buildMonthGrid({ year, month }: JalaliMonth) {
  const firstOfMonth = dayjs(
    `${year}/${month}/1`,
    { jalali: true } as dayjs.OptionType,
  );
  const daysInMonth = firstOfMonth.daysInMonth();
  const startOffset = (firstOfMonth.day() + 1) % 7;
  const cells: Array<{ day: number; storageDate: StorageDate } | null> = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const displayDate = `${year}/${month}/${day}`;
    cells.push({
      day,
      storageDate: toStorageDate(displayDate),
    });
  }

  return cells;
}

function formatJalaliMonthTitle({ year, month }: JalaliMonth): string {
  const label = dayjs(
    `${year}/${month}/1`,
    { jalali: true } as dayjs.OptionType,
  )
    .calendar("jalali")
    .format("MMMM YYYY");
  return toPersianDigits(label);
}

export type DatePickerProps = {
  id?: string;
  value?: StorageDate | null;
  onChange?: (value: StorageDate | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  inputSize?: "md" | "lg";
  className?: string;
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
  ...ariaProps
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [displayValue, setDisplayValue] = React.useState(() =>
    value ? formatDateDisplay(value) : "",
  );
  const [viewMonth, setViewMonth] = React.useState<JalaliMonth>(() =>
    value ? storageToJalaliMonth(value) : currentJalaliMonth(),
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
    <Popover open={open} onOpenChange={setOpen}>
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

      <PopoverContent className="w-[min(20rem,calc(100vw-2*var(--semantic-space-pageMargin)))] p-[var(--primitive-space-3)]">
        <div className="mb-[var(--primitive-space-3)] flex items-center justify-between gap-[var(--primitive-space-2)]">
          <button
            type="button"
            className={cn(
              "inline-flex size-[var(--primitive-space-8)] items-center justify-center rounded-[var(--primitive-radius-md)]",
              "text-[var(--semantic-color-text-primary)] hover:bg-[var(--primitive-color-neutral-100)]",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-color-action-focusRing)]",
            )}
            aria-label="ماه قبل"
            onClick={() => setViewMonth((current) => shiftJalaliMonth(current, -1))}
          >
            <ChevronRight className="size-[var(--primitive-space-4)]" />
          </button>
          <span className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)]">
            {formatJalaliMonthTitle(viewMonth)}
          </span>
          <button
            type="button"
            className={cn(
              "inline-flex size-[var(--primitive-space-8)] items-center justify-center rounded-[var(--primitive-radius-md)]",
              "text-[var(--semantic-color-text-primary)] hover:bg-[var(--primitive-color-neutral-100)]",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-color-action-focusRing)]",
            )}
            aria-label="ماه بعد"
            onClick={() => setViewMonth((current) => shiftJalaliMonth(current, 1))}
          >
            <ChevronLeft className="size-[var(--primitive-space-4)]" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-[var(--primitive-space-1)] text-center">
          {WEEKDAY_LABELS.map((label) => (
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
