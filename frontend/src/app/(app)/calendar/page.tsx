"use client";

import * as React from "react";

import {
  CalendarAgenda,
  mapClassStartDates,
  mapInstallmentDueDates,
  mapTaskDueDates,
  mergeCalendarEvents,
} from "@/components/data-display";
import { ErrorState } from "@/components/feedback";
import { CalendarPageSkeleton } from "@/components/skeletons";
import type { CalendarViewMode } from "@/components/skeletons/types";
import type { ApiError } from "@/lib/api/error";
import { toApiError } from "@/lib/api/errors";
import { listClasses, listInstallments, listInvoices } from "@/lib/api/finance";
import { listTasks } from "@/lib/api/tasks";

export default function CalendarPage() {
  const [mode, setMode] = React.useState<CalendarViewMode>("month");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [events, setEvents] = React.useState<
    ReturnType<typeof mergeCalendarEvents>
  >([]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [classesRes, tasksRes, invoicesRes] = await Promise.all([
        listClasses({ limit: 500 }),
        listTasks({ limit: 500 }),
        listInvoices({ limit: 500 }),
      ]);

      const installmentPages = await Promise.all(
        invoicesRes.items.map((invoice) => listInstallments(invoice.id, { limit: 500 })),
      );
      const installments = installmentPages.flatMap((page) => page.items);

      setEvents(
        mergeCalendarEvents(
          mapClassStartDates(classesRes.items),
          mapInstallmentDueDates(installments),
          mapTaskDueDates(tasksRes.items),
        ),
      );
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری تقویم"));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <CalendarPageSkeleton mode={mode} onModeChange={setMode}>
      <div className={loading ? "pointer-events-none opacity-70" : undefined}>
        <CalendarAgenda events={events} mode={mode} />
      </div>
    </CalendarPageSkeleton>
  );
}
