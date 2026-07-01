"use client";

import * as React from "react";

import { FilterBar, type FilterValues } from "@/components/layout";
import {
  ListPageSkeleton,
  SkeletonDemoShell,
  ZonePlaceholder,
} from "@/components/skeletons";
import { demoListFacets } from "@/components/skeletons/demo/mock-data";
import { Button } from "@/components/ui/button";

export default function ListPageSkeletonDemo() {
  const [filterValues, setFilterValues] = React.useState<FilterValues>({});

  return (
    <SkeletonDemoShell
      title="ListPageSkeleton"
      description="صفحه لیست — عرض حداکثر ۱۲۸۰px. زیر ۷۶۸px منطقه Primary به حالت کارت-list تغییر می‌کند."
      zones="Header · Filter-bar · Primary (table | cardList)"
    >
      <ListPageSkeleton
        title="افراد"
        headerAction={
          <Button type="button" variant="primary" size="md">
            افزودن شخص
          </Button>
        }
        filterBar={
          <FilterBar
            facets={demoListFacets}
            values={filterValues}
            onValuesChange={setFilterValues}
          />
        }
        table={
          <ZonePlaceholder zone="Primary" label="اسلات DataTable (دسکتاپ)" />
        }
        cardList={
          <ZonePlaceholder
            zone="Primary"
            label="اسلات EntitySummaryCard list (موبایل/تبلت)"
          />
        }
      />
    </SkeletonDemoShell>
  );
}
