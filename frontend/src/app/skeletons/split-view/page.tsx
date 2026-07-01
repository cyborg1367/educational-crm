"use client";

import * as React from "react";

import { FilterBar, type FilterValues } from "@/components/layout";
import {
  SkeletonDemoShell,
  SplitViewSkeleton,
  ZonePlaceholder,
} from "@/components/skeletons";
import { demoSplitFacets } from "@/components/skeletons/demo/mock-data";
import { Button } from "@/components/ui/button";

export default function SplitViewSkeletonDemo() {
  const [filterValues, setFilterValues] = React.useState<FilterValues>({});
  const [showDetail, setShowDetail] = React.useState(false);

  return (
    <SkeletonDemoShell
      title="SplitViewSkeleton"
      description="نمای تقسیم‌شده — پنجره راست یک منطقه دائمی در چیدمان است (نه Drawer)."
      zones="Filter-bar · Primary (~40%) · Secondary (persistent)"
    >
      <div className="mb-[var(--primitive-space-4)]">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => setShowDetail((value) => !value)}
        >
          {showDetail ? "پنهان کردن جزئیات" : "نمایش جزئیات انتخاب‌شده"}
        </Button>
      </div>

      <SplitViewSkeleton
        filterBar={
          <FilterBar
            facets={demoSplitFacets}
            values={filterValues}
            onValuesChange={setFilterValues}
          />
        }
        table={
          <ZonePlaceholder zone="Primary" label="اسلات DataTable (قابل انتخاب)" />
        }
        detail={
          showDetail ? (
            <div className="p-[var(--primitive-space-6)]">
              <ZonePlaceholder
                zone="Secondary"
                label="محتوای جزئیات وظیفه انتخاب‌شده"
                className="min-h-[var(--primitive-space-32)] border-0 bg-transparent"
              />
            </div>
          ) : null
        }
      />
    </SkeletonDemoShell>
  );
}
