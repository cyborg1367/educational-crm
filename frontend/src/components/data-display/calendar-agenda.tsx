"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import dayjs from "dayjs";

import { EmptyState } from "@/components/feedback/empty-state";
import {
  CALENDAR_EVENT_TYPE_COLORS,
  type CalendarEvent,
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
    <span className={cn("inline-flex items-center gap-[var(--primitive-space-1)]", className)}>
      <EventDot type={event.type} />
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

function MonthGridInner({
  events,
  anchorMonth,
  onMonthChange,
}: {
  events: CalendarEvent[];
  anchorMonth: StorageDate;
  onMonthChange?: (date: StorageDate) => void;
}) {
  const [viewMonth, setViewMonth] = React.useState<JalaliMonth>(() =>
    storageToJalaliMonth(anchorMonth),
  );

  const eventsByDate = groupEventsByDate(events);
  const monthCells = buildMonthGrid(viewMonth);

  const handleMonthShift = (delta: number) => {
    const next = shiftJalaliMonth(viewMonth, delta);
    setViewMonth(next);
    onMonthChange?.(jalaliMonthToStorageAnchor(next));
  };

  return (
    <div>
      <div className="mb-[var(--primitive-space-4)] flex items-center justify-between gap-[var(--primitive-space-2)]">
        <button
          type="button"
          className={cn(
            "inline-flex size-[var(--primitive-space-8)] items-center justify-center rounded-[var(--primitive-radius-md)]",
            "text-[var(--semantic-color-text-primary)] hover:bg-[var(--primitive-color-neutral-100)]",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-color-action-focusRing)]",
          )}
          aria-label="ماه قبل"
          onClick={() => handleMonthShift(-1)}
        >
          <ChevronRight className="size-[var(--primitive-space-4)]" />
        </button>
        <span className="text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-medium)]">
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
          onClick={() => handleMonthShift(1)}
        >
          <ChevronLeft className="size-[var(--primitive-space-4)]" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-[var(--primitive-space-1)]">
        {JALALI_WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="py-[var(--primitive-space-1)] text-center text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]"
          >
            {label}
          </span>
        ))}
        {monthCells.map((cell, index) => {
          if (!cell) {
            return <span key={`empty-${index}`} aria-hidden />;
          }

          const dayEvents = eventsByDate.get(cell.storageDate) ?? [];
          const visibleEvents = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visibleEvents.length;

          return (
            <div
              key={`${cell.storageDate}-${index}`}
              className={cn(
                "min-h-[var(--primitive-space-16)] rounded-[var(--primitive-radius-sm)] border border-[var(--semantic-color-surface-border)]",
                "p-[var(--primitive-space-1)]",
              )}
            >
              <span className="block text-center text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
                {toPersianDigits(String(cell.day))}
              </span>
              <div className="mt-[var(--primitive-space-1)] flex flex-wrap justify-center gap-[var(--primitive-space-1)]">
                {visibleEvents.map((event, eventIndex) => (
                  <EventDot
                    key={`${event.type}-${event.label}-${eventIndex}`}
                    type={event.type}
                  />
                ))}
                {overflow > 0 ? (
                  <span className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                    +{formatCount(overflow)}
                  </span>
                ) : null}
              </div>
              <div className="mt-[var(--primitive-space-1)] hidden flex-col gap-[var(--primitive-space-1)] sm:flex">
                {visibleEvents.map((event, eventIndex) => (
                  <EventLink
                    key={`link-${event.type}-${event.label}-${eventIndex}`}
                    event={event}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
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
          <p className="mb-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
            {formatDateDisplay(date)}
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

  return (
    <div
      className={cn(
        "rounded-[var(--primitive-radius-md)] bg-[var(--semantic-color-surface-card)] p-[var(--semantic-space-cardPadding)]",
        "shadow-[var(--primitive-elevation-1)]",
        className,
      )}
    >
      {mode === "month" ? (
        <MonthGridView
          events={events}
          anchorMonth={anchorMonth}
          onMonthChange={onMonthChange}
        />
      ) : (
        <AgendaListView events={events} daysAhead={agendaDaysAhead} />
      )}
    </div>
  );
}

export { CalendarAgenda };
