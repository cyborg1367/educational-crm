"use client";

import * as React from "react";

import { CalendarAgenda } from "@/components/data-display";
import {
  CalendarPageSkeleton,
  SkeletonDemoShell,
} from "@/components/skeletons";
import { demoCalendarEvents } from "@/components/skeletons/demo/mock-data";
import type { CalendarViewMode } from "@/components/skeletons/types";

export default function CalendarPageSkeletonDemo() {
  const [mode, setMode] = React.useState<CalendarViewMode>("month");

  return (
    <SkeletonDemoShell
      title="CalendarPageSkeleton"
      description="صفحه تقویم — تعویض حالت ماهانه/دستور کار در Header."
      zones="Header (mode toggle) · Primary (CalendarAgenda)"
    >
      <CalendarPageSkeleton mode={mode} onModeChange={setMode}>
        <CalendarAgenda events={demoCalendarEvents} mode={mode} />
      </CalendarPageSkeleton>
    </SkeletonDemoShell>
  );
}
