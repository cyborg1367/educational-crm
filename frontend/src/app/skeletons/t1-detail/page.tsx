"use client";

import {
  SkeletonDemoShell,
  T1DetailSkeleton,
  ZonePlaceholder,
} from "@/components/skeletons";

export default function T1DetailSkeletonDemo() {
  return (
    <SkeletonDemoShell
      title="T1DetailSkeleton"
      description="جزئیات T1 با تب‌ها — دو ستونه در دسکتاپ (Primary حداکثر ۹۶۰px + Secondary ۳۲۰px)."
      zones="Header · Primary (EntityTabs) · Secondary"
    >
      <T1DetailSkeleton
        title="علی رضایی"
        statusAction={
          <ZonePlaceholder
            zone="Header"
            label="اسلات StatusAction"
            className="min-h-[var(--primitive-space-12)]"
          />
        }
        permissionBanner={
          <div className="rounded-[var(--primitive-radius-sm)] bg-[var(--semantic-color-surface-subtle)] px-[var(--primitive-space-4)] py-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            اسلات PermissionBanner — فقط مشاهده برای نقش شما
          </div>
        }
        tabs={[
          {
            id: "overview",
            label: "اطلاعات کلی",
            content: (
              <ZonePlaceholder zone="Primary" label="محتوای تب اطلاعات کلی" />
            ),
          },
          {
            id: "enrollments",
            label: "ثبت‌نام‌ها",
            content: (
              <ZonePlaceholder zone="Primary" label="محتوای تب ثبت‌نام‌ها" />
            ),
          },
          {
            id: "timeline",
            label: "تایم‌لاین",
            content: (
              <ZonePlaceholder zone="Primary" label="محتوای تب تایم‌لاین" />
            ),
          },
        ]}
        secondary={
          <ZonePlaceholder
            zone="Secondary"
            label="اسلات RelationshipCard"
          />
        }
        entityTabsProps={{ "aria-label": "تب‌های جزئیات موجودیت" }}
      />
    </SkeletonDemoShell>
  );
}
