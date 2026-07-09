"use client";

import * as React from "react";
import Link from "next/link";

import { focusVisibleStyles } from "@/components/form/control-styles";
import { PageZone } from "@/components/skeletons/page-zone";
import type { SettingsNavLink } from "@/components/skeletons/types";
import { cn } from "@/lib/utils";

export type SettingsLayoutSkeletonProps = {
  links: SettingsNavLink[];
  children: React.ReactNode;
  className?: string;
};

function SettingsLayoutSkeleton({
  links,
  children,
  className,
}: SettingsLayoutSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[var(--semantic-space-sectionGap)] md:flex-row",
        className,
      )}
    >
      <nav
        aria-label="زیرمنوی تنظیمات"
        className="flex shrink-0 flex-col gap-[var(--primitive-space-1)] md:w-[220px]"
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.active ? "page" : undefined}
            className={cn(
              "rounded-[var(--primitive-radius-sm)] border-s-2 px-[var(--primitive-space-4)] py-[var(--primitive-space-3)]",
              "text-[length:var(--primitive-font-size-sm)] transition-colors",
              focusVisibleStyles,
              link.active
                ? "border-[var(--semantic-color-action-primary)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-action-primary)]"
                : "border-transparent text-[var(--semantic-color-text-secondary)] hover:bg-[var(--primitive-color-neutral-50)] hover:text-[var(--semantic-color-text-primary)]",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <PageZone name="Primary" className="min-w-0 flex-1">
        {children}
      </PageZone>
    </div>
  );
}

export { SettingsLayoutSkeleton };
