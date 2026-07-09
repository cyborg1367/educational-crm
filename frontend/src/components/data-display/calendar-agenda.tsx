"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import dayjs from "dayjs";

import { EmptyState } from "@/components/feedback/empty-state";
import {
  CALENDAR_EVENT_TYPE_COLORS,
  CALENDAR_EVENT_TYPE_LABELS,
  type CalendarEvent,
  type CalendarEventType,
} from "@/components/data-display/calendar-adapters";
import {
  buildMonthGrid,
  formatJalaliMonthTitle,
  JALALI_WEEKDAY_LABELS,
  jalaliMonthToStorageAnchor,
  shiftJalaliMonth,
  storageToJalaliMonth,
  type JalaliMonth,
} from "@/lib/locale/jalali-month";
import { formatDateDisplay, todayStorage, type StorageDate } from "@/lib/locale/date";
import { formatCount, toPersianDigits } from "@/lib/locale/number";
import { cn } from "@/lib/utils";

export type CalendarAgendaProps = {
  events: CalendarEvent[];
  mode: "month" | "agenda";
  month?: StorageDate;
  onMonthChange?: (date: StorageDate) => void;
  agendaDaysAhead?: number;
  className?: string;
};

const EVENT_TYPES: CalendarEventType[] = ["class", "installment", "task"];

function groupEventsByDate(
  events: CalendarEvent[],
): Map<StorageDate, CalendarEvent[]> {
  const map = new Map<StorageDate, CalendarEvent[]>();
  for (const event of events) {
    const existing = map.get(event.date) ?? [];
    existing.push(event);
    map.set(event.date, existing);
  }
  return map;
}

function filterUpcomingEvents(
  events: CalendarEvent[],
  daysAhead: number,
): CalendarEvent[] {
  const today = todayStorage();
  const end = dayjs(today).add(daysAhead, "day").format("YYYY-MM-DD");

  return events
    .filter((event) => event.date >= today && event.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function EventDot({ type }: { type: CalendarEvent["type"] }) {
  return (
    <span
      className="inline-block size-[var(--primitive-space-2)] shrink-0 rounded-[var(--primitive-radius-full)]"
      style={{ backgroundColor: CALENDAR_EVENT_TYPE_COLORS[type] }}
      aria-hidden
    />
  );
}

function EventLink({
  event,
  className,
}: {
  event: CalendarEvent;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-[var(--primitive-space-2)]", className)}>
      <EventDot type={event.type} />
      <span className="shrink-0 text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
        {CALENDAR_EVENT_TYPE_LABELS[event.type]}
      </span>
      {event.href ? (
        <Link
          href={event.href}
          className="truncate text-[var(--semantic-color-text-link)] hover:underline"
        >
          {event.label}
        </Link>
      ) : (
        <span className="truncate text-[var(--semantic-color-text-secondary)]">
          {event.label}
        </span>
      )}
    </span>
  );
}

/** Legend that doubles as a per-type filter. */
function EventTypeFilter({
  events,
  activeTypes,
  onToggle,
}: {
  events: CalendarEvent[];
  activeTypes: Set<CalendarEventType>;
  onToggle: (type: CalendarEventType) => void;
}) {
  const countByType = React.useMemo(() => {
    const counts = new Map<CalendarEventType, number>();
    for (const event of events) {
      counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
    }
    return counts;
  }, [events]);

  return (
    <div
      className="flex flex-wrap items-center gap-[var(--primitive-space-2)]"
      role="group"
      aria-label="فیلتر نوع رویداد"
    >
      {EVENT_TYPES.map((type) => {
        const active = activeTypes.has(type);
        return (
          <button
            key={type}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(type)}
            className={cn(
              "inline-flex items-center gap-[var(--primitive-space-2)] rounded-[var(--primitive-radius-full)] border",
              "px-[var(--primitive-space-3)] py-[var(--primitive-space-1)]",
              "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)]",
              "transition-colors duration-150",
              active
                ? "border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] text-[var(--semantic-color-text-primary)] shadow-[var(--primitive-elevation-1)]"
                : "border-transparent bg-[var(--semantic-color-surface-subtle)] text-[var(--semantic-color-text-secondary)] opacity-60",
            )}
          >
            <EventDot type={type} />
            {CALENDAR_EVENT_TYPE_LABELS[type]}
            <span className="text-[var(--semantic-color-text-secondary)]">
              ({formatCount(countByType.get(type) ?? 0)})
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SelectedDayPanel({
  date,
  events,
}: {
  date: StorageDate;
  events: CalendarEvent[];
}) {
  return (
    <div
      className={cn(
        "mt-[var(--primitive-space-4)] rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)]",
        "bg-[var(--semantic-color-surface-subtle)]/60 px-[var(--primitive-space-4)] py-[var(--primitive-space-3)]",
      )}
    >
      <p className="mb-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
        رویدادهای {formatDateDisplay(date)}
      </p>
      {events.length === 0 ? (
        <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
          رویدادی در این روز ثبت نشده است.
        </p>
      ) : (
        <ul className="space-y-[var(--primitive-space-2)]">
          {events.map((event, index) => (
            <li key={`${event.type}-${event.label}-${index}`}>
              <EventLink
                event={event}
                className="text-[length:var(--primitive-font-size-sm)]"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MonthGridInner({
  events,
  anchorMonth,
  onMonthChange,
}: {
  events: CalendarEvent[];
  anchorMonth: StorageDate;
  onMonthChange?: (date: StorageDate) => void;
}) {
  const today = todayStorage();
  const [viewMonth, setViewMonth] = React.useState<JalaliMonth>(() =>
    storageToJalaliMonth(anchorMonth),
  );
  const [selectedDate, setSelectedDate] = React.useState<StorageDate | null>(
    () => {
      // Pre-select today when it falls inside the visible month.
      const currentMonth = storageToJalaliMonth(anchorMonth);
      const todayMonth = storageToJalaliMonth(today);
      return currentMonth.year === todayMonth.year &&
        currentMonth.month === todayMonth.month
        ? today
        : null;
    },
  );

  const eventsByDate = groupEventsByDate(events);
  const monthCells = buildMonthGrid(viewMonth);

  const handleMonthShift = (delta: number) => {
    const next = shiftJalaliMonth(viewMonth, delta);
    setViewMonth(next);
    setSelectedDate(null);
    onMonthChange?.(jalaliMonthToStorageAnchor(next));
  };

  const todayMonth = storageToJalaliMonth(today);
  const viewingCurrentMonth =
    viewMonth.year === todayMonth.year && viewMonth.month === todayMonth.month;

  const handleJumpToToday = () => {
    if (!viewingCurrentMonth) {
      setViewMonth(todayMonth);
      onMonthChange?.(jalaliMonthToStorageAnchor(todayMonth));
    }
    setSelectedDate(today);
  };

  const navButtonClassName = cn(
    "inline-flex size-[var(--primitive-space-8)] items-center justify-center rounded-[var(--primitive-radius-md)]",
    "text-[var(--semantic-color-text-primary)] hover:bg-[var(--primitive-color-neutral-100)]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-color-action-focusRing)]",
  );

  return (
    <div>
      <div className="mb-[var(--primitive-space-4)] flex items-center justify-between gap-[var(--primitive-space-2)]">
        <div className="flex items-center gap-[var(--primitive-space-1)]">
          <button
            type="button"
            className={navButtonClassName}
            aria-label="ماه قبل"
            onClick={() => handleMonthShift(-1)}
          >
            <ChevronRight className="size-[var(--primitive-space-4)]" />
          </button>
          <button
            type="button"
            className={navButtonClassName}
            aria-label="ماه بعد"
            onClick={() => handleMonthShift(1)}
          >
            <ChevronLeft className="size-[var(--primitive-space-4)]" />
          </button>
        </div>
        <span className="text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-semibold)]">
          {formatJalaliMonthTitle(viewMonth)}
        </span>
        <button
          type="button"
          onClick={handleJumpToToday}
          className={cn(
            "rounded-[var(--primitive-radius-full)] border border-[var(--semantic-color-surface-border)]",
            "px-[var(--primitive-space-3)] py-[var(--primitive-space-1)]",
            "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)]",
            "text-[var(--semantic-color-text-secondary)] transition-colors",
            "hover:bg-[var(--semantic-color-surface-subtle)] hover:text-[var(--semantic-color-text-primary)]",
          )}
        >
          امروز
        </button>
      </div>

      <div className="grid grid-cols-7 gap-[var(--primitive-space-1)]">
        {JALALI_WEEKDAY_LABELS.map((label, index) => (
          <span
            key={label}
            className={cn(
              "py-[var(--primitive-space-1)] text-center text-[length:var(--primitive-font-size-xs)]",
              index === 6
                ? "font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-status-danger)]/70"
                : "text-[var(--semantic-color-text-secondary)]",
            )}
          >
            {label}
          </span>
        ))}
        {monthCells.map((cell, index) => {
          if (!cell) {
            return <span key={`empty-${index}`} aria-hidden />;
          }

          const dayEvents = eventsByDate.get(cell.storageDate) ?? [];
          const visibleEvents = dayEvents.slice(0, 4);
          const overflow = dayEvents.length - visibleEvents.length;
          const isToday = cell.storageDate === today;
          const isSelected = cell.storageDate === selectedDate;
          const isFriday = index % 7 === 6;

          return (
            <button
              key={`${cell.storageDate}-${index}`}
              type="button"
              onClick={() =>
                setSelectedDate(isSelected ? null : cell.storageDate)
              }
              aria-pressed={isSelected}
              aria-label={`${formatDateDisplay(cell.storageDate)}${
                dayEvents.length > 0
                  ? `، ${formatCount(dayEvents.length)} رویداد`
                  : ""
              }`}
              className={cn(
                "min-h-[var(--primitive-space-16)] rounded-[var(--primitive-radius-sm)] border p-[var(--primitive-space-1)]",
                "text-center transition-colors duration-150",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--semantic-color-action-focusRing)]",
                isSelected
                  ? "border-[var(--semantic-color-action-primary)] bg-[var(--primitive-color-brand-50)]"
                  : isToday
                    ? "border-[var(--primitive-color-brand-300)] bg-[var(--primitive-color-brand-50)]/50 hover:bg-[var(--primitive-color-brand-50)]"
                    : cn(
                        "border-[var(--semantic-color-surface-border)] hover:bg-[var(--semantic-color-surface-subtle)]",
                        isFriday && "bg-[var(--semantic-color-surface-subtle)]/50",
                      ),
              )}
            >
              <span
                className={cn(
                  "mx-auto flex size-6 items-center justify-center rounded-[var(--primitive-radius-full)]",
                  "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)]",
                  isToday
                    ? "bg-[var(--semantic-color-action-primary)] text-[var(--semantic-color-text-inverse)]"
                    : isFriday
                      ? "text-[var(--semantic-color-status-danger)]/70"
                      : "text-[var(--semantic-color-text-primary)]",
                )}
              >
                {toPersianDigits(String(cell.day))}
              </span>
              <span className="mt-[var(--primitive-space-1)] flex flex-wrap items-center justify-center gap-[var(--primitive-space-1)]">
                {visibleEvents.map((event, eventIndex) => (
                  <EventDot
                    key={`${event.type}-${event.label}-${eventIndex}`}
                    type={event.type}
                  />
                ))}
                {overflow > 0 ? (
                  <span className="text-[length:var(--primitive-font-size-xs)] leading-none text-[var(--semantic-color-text-secondary)]">
                    +{formatCount(overflow)}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {selectedDate ? (
        <SelectedDayPanel
          date={selectedDate}
          events={eventsByDate.get(selectedDate) ?? []}
        />
      ) : (
        <p className="mt-[var(--primitive-space-4)] text-center text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
          برای دیدن جزئیات رویدادهای هر روز، روی آن روز کلیک کنید.
        </p>
      )}
    </div>
  );
}

function MonthGridView(props: {
  events: CalendarEvent[];
  anchorMonth: StorageDate;
  onMonthChange?: (date: StorageDate) => void;
}) {
  return <MonthGridInner key={props.anchorMonth} {...props} />;
}

function AgendaListView({
  events,
  daysAhead,
}: {
  events: CalendarEvent[];
  daysAhead: number;
}) {
  const upcoming = filterUpcomingEvents(events, daysAhead);

  if (upcoming.length === 0) {
    return (
      <EmptyState
        icon={CalendarIcon}
        message="رویدادی در پیش‌رو نیست"
      />
    );
  }

  const today = todayStorage();
  const grouped = new Map<StorageDate, CalendarEvent[]>();
  for (const event of upcoming) {
    const list = grouped.get(event.date) ?? [];
    list.push(event);
    grouped.set(event.date, list);
  }

  return (
    <ul className="divide-y divide-[var(--semantic-color-surface-border)]">
      {Array.from(grouped.entries()).map(([date, dayEvents]) => (
        <li key={date} className="py-[var(--primitive-space-4)]">
          <p className="mb-[var(--primitive-space-2)] inline-flex items-center gap-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
            {formatDateDisplay(date)}
            {date === today ? (
              <span className="rounded-[var(--primitive-radius-full)] bg-[var(--primitive-color-brand-50)] px-[var(--primitive-space-2)] py-0.5 text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-[var(--primitive-color-brand-700)]">
                امروز
              </span>
            ) : null}
          </p>
          <ul className="space-y-[var(--primitive-space-2)]">
            {dayEvents.map((event, index) => (
              <li key={`${event.type}-${event.label}-${index}`}>
                <EventLink
                  event={event}
                  className="text-[length:var(--primitive-font-size-sm)]"
                />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function CalendarAgenda({
  events,
  mode,
  month,
  onMonthChange,
  agendaDaysAhead = 30,
  className,
}: CalendarAgendaProps) {
  const anchorMonth = month ?? todayStorage();
  const [activeTypes, setActiveTypes] = React.useState<Set<CalendarEventType>>(
    () => new Set(EVENT_TYPES),
  );

  const toggleType = (type: CalendarEventType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
        // Never allow zero active types — re-enable everything instead.
        if (next.size === 0) {
          return new Set(EVENT_TYPES);
        }
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const filteredEvents = React.useMemo(
    () => events.filter((event) => activeTypes.has(event.type)),
    [events, activeTypes],
  );

  return (
    <div
      className={cn(
        "rounded-[var(--primitive-radius-md)] bg-[var(--semantic-color-surface-card)] p-[var(--semantic-space-cardPadding)]",
        "shadow-[var(--primitive-elevation-1)]",
        className,
      )}
    >
      <div className="mb-[var(--primitive-space-4)]">
        <EventTypeFilter
          events={events}
          activeTypes={activeTypes}
          onToggle={toggleType}
        />
      </div>

      {mode === "month" ? (
        <MonthGridView
          events={filteredEvents}
          anchorMonth={anchorMonth}
          onMonthChange={onMonthChange}
        />
      ) : (
        <AgendaListView events={filteredEvents} daysAhead={agendaDaysAhead} />
      )}
    </div>
  );
}

export { CalendarAgenda };
