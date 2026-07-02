"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { SettingsLayoutSkeleton } from "@/components/skeletons";

const SETTINGS_LINKS = [
  { href: "/settings/org", label: "سازمان" },
  { href: "/settings/profile", label: "پروفایل" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const links = SETTINGS_LINKS.map((link) => ({
    ...link,
    active: pathname === link.href,
  }));

  return (
    <div className="mx-auto w-full max-w-[960px]">
      <h1 className="mb-[var(--semantic-space-sectionGap)] text-[length:var(--primitive-font-size-2xl)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
        تنظیمات
      </h1>
      <SettingsLayoutSkeleton links={links}>{children}</SettingsLayoutSkeleton>
    </div>
  );
}
