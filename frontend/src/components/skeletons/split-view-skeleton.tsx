import * as React from "react";
import { MousePointerClick } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageZone } from "@/components/skeletons/page-zone";
import { cn } from "@/lib/utils";

export type SplitViewSkeletonProps = {
  filterBar: React.ReactNode;
  table: React.ReactNode;
  detail?: React.ReactNode | null;
  emptyState?: React.ReactNode;
  className?: string;
};

function SplitViewSkeleton({
  filterBar,
  table,
  detail,
  emptyState,
  className,
}: SplitViewSkeletonProps) {
  const resolvedEmptyState = emptyState ?? (
    <EmptyState
      icon={MousePointerClick}
      message="یک مورد از لیست انتخاب کنید تا جزئیات آن اینجا نمایش داده شود."
    />
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-[var(--semantic-space-sectionGap)]",
        className,
      )}
    >
      <PageZone name="Filter-bar">{filterBar}</PageZone>

      <div className="flex flex-col gap-[var(--semantic-space-sectionGap)] md:flex-row">
        <PageZone name="Primary" className="md:w-[40%] md:shrink-0">
          {table}
        </PageZone>

        <PageZone
          name="Secondary"
          className={cn(
            "min-h-[var(--primitive-space-48)] rounded-[var(--primitive-radius-md)]",
            "border border-[var(--semantic-color-surface-border)]",
            "bg-[var(--semantic-color-surface-card)]",
            "md:flex-1",
          )}
        >
          {detail ? detail : resolvedEmptyState}
        </PageZone>
      </div>
    </div>
  );
}

export { SplitViewSkeleton };
