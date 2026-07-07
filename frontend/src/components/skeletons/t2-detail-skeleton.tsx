import * as React from "react";

import { PageZone } from "@/components/skeletons/page-zone";
import { cn } from "@/lib/utils";

export type T2DetailSkeletonProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

function T2DetailSkeleton({
  title,
  subtitle,
  headerAction,
  children,
  className,
}: T2DetailSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[var(--semantic-space-sectionGap)]",
        className,
      )}
    >
      <PageZone name="Header">
        <div className="flex flex-wrap items-center justify-between gap-[var(--primitive-space-4)]">
          <div className="flex flex-col gap-[var(--primitive-space-1)]">
            <h1 className="text-[length:var(--primitive-font-size-2xl)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {headerAction ? (
            <div className="shrink-0">{headerAction}</div>
          ) : null}
        </div>
      </PageZone>

      <PageZone name="Primary">{children}</PageZone>
    </div>
  );
}

export { T2DetailSkeleton };
