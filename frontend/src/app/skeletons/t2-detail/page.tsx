"use client";

import {
  SkeletonDemoShell,
  T2DetailSkeleton,
  ZonePlaceholder,
} from "@/components/skeletons";
import { Button } from "@/components/ui/button";

export default function T2DetailSkeletonDemo() {
  return (
    <SkeletonDemoShell
      title="T2DetailSkeleton"
      description="جزئیات T2 تک‌ستونه — بدون تب و بدون ستون فرعی."
      zones="Header · Primary"
    >
      <T2DetailSkeleton
        title="نقشه راه برنامه‌نویسی ۱۴۰۵"
        headerAction={
          <Button type="button" variant="secondary" size="md">
            ویرایش
          </Button>
        }
      >
        <ZonePlaceholder
          zone="Primary"
          label="محتوای تک‌ستونه (مثلاً DataTable فشرده)"
        />
      </T2DetailSkeleton>
    </SkeletonDemoShell>
  );
}
