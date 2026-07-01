"use client";

import * as React from "react";

import { PageZone } from "@/components/skeletons/page-zone";
import type { CalendarViewMode } from "@/components/skeletons/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarPageSkeletonProps = {
  mode: CalendarViewMode;
  onModeChange: (mode: CalendarViewMode) => void;
  children: React.ReactNode;
  className?: string;
};

function CalendarPageSkeleton({
  mode,
  onModeChange,
  children,
  className,
}: CalendarPageSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[var(--semantic-space-sectionGap)]",
        className,
      )}
    >
      <PageZone name="Header">
        <div className="flex flex-wrap items-center justify-between gap-[var(--primitive-space-4)]">
          <h1 className="text-[length:var(--primitive-font-size-2xl)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
            تقویم
          </h1>
          <div
            className="flex gap-[var(--primitive-space-2)]"
            role="group"
            aria-label="حالت نمایش تقویم"
          >
            <Button
              type="button"
              variant={mode === "month" ? "primary" : "secondary"}
              size="md"
              onClick={() => onModeChange("month")}
            >
              ماهانه
            </Button>
            <Button
              type="button"
              variant={mode === "agenda" ? "primary" : "secondary"}
              size="md"
              onClick={() => onModeChange("agenda")}
            >
              دستور کار
            </Button>
          </div>
        </div>
      </PageZone>

      <PageZone name="Primary" className="w-full">
        {children}
      </PageZone>
    </div>
  );
}

export { CalendarPageSkeleton };
