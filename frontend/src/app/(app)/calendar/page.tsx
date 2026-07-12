"use client";

import * as React from "react";
import dayjs from "dayjs";

import {
  CalendarAgenda,
  mapClassSessions,
  mapInstallmentDueDates,
  mapTaskDueDates,
  mergeCalendarEvents,
} from "@/components/data-display";
import { ErrorState } from "@/components/feedback";
import { CalendarPageSkeleton } from "@/components/skeletons";
import type { CalendarViewMode } from "@/components/skeletons/types";
import type { ApiError } from "@/lib/api/error";
import { toApiError } from "@/lib/api/errors";
import type {
  CourseClassRead,
  InstallmentRead,
  TaskRead,
} from "@/lib/api/types";
import { listAllInstallments, listClasses } from "@/lib/api/finance";
import { listTasks } from "@/lib/api/tasks";
import { todayStorage, type StorageDate } from "@/lib/locale/date";

const AGENDA_DAYS_AHEAD = 30;

export default function CalendarPage() {
  const [mode, setMode] = React.useState<CalendarViewMode>("month");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [visibleMonth, setVisibleMonth] = React.useState<StorageDate>(() =>
    todayStorage(),
  );
  const [classes, setClasses] = React.useState<CourseClassRead[]>([]);
  const [installments, setInstallments] = React.useState<InstallmentRead[]>([]);
  const [tasks, setTasks] = React.useState<TaskRead[]>([]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Installments come from a single org-wide, date-bounded request —
      // previously this page issued one request per invoice.
      const today = todayStorage();
      const [classesRes, tasksRes, installmentsRes] = await Promise.all([
        listClasses({ limit: 500 }),
        listTasks({ limit: 500 }),
        listAllInstallments({
          due_from: dayjs(today).subtract(6, "month").format("YYYY-MM-DD"),
          due_to: dayjs(today).add(12, "month").format("YYYY-MM-DD"),
          limit: 500,
        }),
      ]);

      // A class with no enrollment records left (e.g. every enrolled person
      // was deleted) has nobody to meet for — don't clutter the calendar
      // with sessions for it. The class definition itself is untouched.
      setClasses(
        classesRes.items.filter((item) => item.enrollment_count > 0),
      );
      setTasks(tasksRes.items);
      setInstallments(installmentsRes.items);
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری تقویم"));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const events = React.useMemo(() => {
    // Expand class weekday schedules into per-session events for the window
    // the user can currently see: the visible month (with a little slack)
    // plus the agenda range from today.
    const today = todayStorage();
    const from = (visibleMonth < today ? visibleMonth : today) as StorageDate;
    const monthEnd = dayjs(visibleMonth)
      .add(32, "day")
      .format("YYYY-MM-DD") as StorageDate;
    const agendaEnd = dayjs(today)
      .add(AGENDA_DAYS_AHEAD, "day")
      .format("YYYY-MM-DD") as StorageDate;
    const to = monthEnd > agendaEnd ? monthEnd : agendaEnd;

    return mergeCalendarEvents(
      mapClassSessions(classes, { from, to }),
      mapInstallmentDueDates(installments),
      mapTaskDueDates(tasks),
    );
  }, [classes, installments, tasks, visibleMonth]);

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <CalendarPageSkeleton mode={mode} onModeChange={setMode}>
      <div className={loading ? "pointer-events-none opacity-70" : undefined}>
        <CalendarAgenda
          events={events}
          mode={mode}
          month={visibleMonth}
          onMonthChange={setVisibleMonth}
          agendaDaysAhead={AGENDA_DAYS_AHEAD}
        />
      </div>
    </CalendarPageSkeleton>
  );
}
