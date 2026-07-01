"use client";

import { BlockSkeleton } from "@/components/feedback/skeleton";
import {
  DashboardSkeleton,
  SkeletonDemoShell,
  ZonePlaceholder,
} from "@/components/skeletons";
import { todayDisplay } from "@/lib/locale";

export default function DashboardSkeletonDemo() {
  const todayLabel = todayDisplay();

  return (
    <SkeletonDemoShell
      title="DashboardSkeleton"
      description="داشبورد نقش‌محور — شبکه ۱۲ ستونه با ویجت‌های قابل پیکربندی."
      zones="Header · Primary (12-col grid)"
    >
      <DashboardSkeleton
        header={
          <div>
            <p className="text-[length:var(--primitive-font-size-lg)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
              سلام، مدیر عزیز
            </p>
            <p className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
              {todayLabel}
            </p>
          </div>
        }
        widgets={[
          {
            colSpan: 3,
            content: (
              <ZonePlaceholder zone="Primary" label="StatCard KPI 1">
                <BlockSkeleton height="var(--primitive-space-16)" width="60%" />
              </ZonePlaceholder>
            ),
          },
          {
            colSpan: 3,
            content: (
              <ZonePlaceholder zone="Primary" label="StatCard KPI 2">
                <BlockSkeleton height="var(--primitive-space-16)" width="60%" />
              </ZonePlaceholder>
            ),
          },
          {
            colSpan: 3,
            content: (
              <ZonePlaceholder zone="Primary" label="StatCard KPI 3">
                <BlockSkeleton height="var(--primitive-space-16)" width="60%" />
              </ZonePlaceholder>
            ),
          },
          {
            colSpan: 3,
            content: (
              <ZonePlaceholder zone="Primary" label="StatCard KPI 4">
                <BlockSkeleton height="var(--primitive-space-16)" width="60%" />
              </ZonePlaceholder>
            ),
          },
          {
            colSpan: 12,
            content: (
              <ZonePlaceholder zone="Primary" label="AnalyticsChart (full width)">
                <BlockSkeleton height="var(--primitive-space-48)" width="100%" />
              </ZonePlaceholder>
            ),
          },
        ]}
      />
    </SkeletonDemoShell>
  );
}
