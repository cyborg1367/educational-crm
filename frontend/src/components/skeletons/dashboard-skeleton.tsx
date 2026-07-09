import * as React from "react";

import { PageZone } from "@/components/skeletons/page-zone";
import type { DashboardWidget } from "@/components/skeletons/types";
import { cn } from "@/lib/utils";

const MD_COL_SPAN: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  8: "md:col-span-8",
  9: "md:col-span-9",
  10: "md:col-span-10",
  11: "md:col-span-11",
  12: "md:col-span-12",
};

export type DashboardSkeletonProps = {
  header: React.ReactNode;
  widgets: DashboardWidget[];
  className?: string;
};

function DashboardSkeleton({
  header,
  widgets,
  className,
}: DashboardSkeletonProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1360px] flex-col gap-[var(--semantic-space-sectionGap)]",
        className,
      )}
    >
      <PageZone name="Header">{header}</PageZone>

      <PageZone name="Primary">
        <div className="grid grid-cols-12 gap-[var(--semantic-space-sectionGap)]">
          {widgets.map((widget, index) => (
            <div
              key={`dashboard-widget-${index}`}
              className={cn(
                "col-span-12",
                MD_COL_SPAN[widget.colSpan] ?? "md:col-span-12",
              )}
            >
              {widget.content}
            </div>
          ))}
        </div>
      </PageZone>
    </div>
  );
}

export { DashboardSkeleton };
