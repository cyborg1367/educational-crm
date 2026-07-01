"use client";

import {
  SettingsLayoutSkeleton,
  SkeletonDemoShell,
  ZonePlaceholder,
} from "@/components/skeletons";

export default function SettingsLayoutSkeletonDemo() {
  return (
    <SkeletonDemoShell
      title="SettingsLayoutSkeleton"
      description="چیدمان تنظیمات — زیرمنوی عمودی + پنل محتوا."
      zones="Sub-nav · Primary"
    >
      <SettingsLayoutSkeleton
        links={[
          { href: "/skeletons/settings-layout", label: "عمومی", active: true },
          { href: "/skeletons/settings-layout#notifications", label: "اعلان‌ها" },
          { href: "/skeletons/settings-layout#security", label: "امنیت" },
        ]}
      >
        <ZonePlaceholder zone="Primary" label="محتوای پنل تنظیمات" />
      </SettingsLayoutSkeleton>
    </SkeletonDemoShell>
  );
}
