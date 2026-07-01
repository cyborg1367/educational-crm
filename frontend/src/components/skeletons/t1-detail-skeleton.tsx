"use client";

import * as React from "react";

import { EntityTabs, type EntityTab, type EntityTabsProps } from "@/components/layout/entity-tabs";
import { PageZone } from "@/components/skeletons/page-zone";
import { cn } from "@/lib/utils";

export type T1DetailSkeletonProps = {
  title: React.ReactNode;
  statusAction?: React.ReactNode;
  permissionBanner?: React.ReactNode;
  tabs: EntityTab[];
  secondary: React.ReactNode;
  entityTabsProps?: Omit<EntityTabsProps, "tabs">;
  className?: string;
};

function T1DetailSkeleton({
  title,
  statusAction,
  permissionBanner,
  tabs,
  secondary,
  entityTabsProps,
  className,
}: T1DetailSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[var(--semantic-space-sectionGap)]",
        className,
      )}
    >
      <PageZone name="Header">
        <div className="flex flex-col gap-[var(--primitive-space-4)]">
          <div className="flex flex-wrap items-start justify-between gap-[var(--primitive-space-4)]">
            <h1 className="text-[length:var(--primitive-font-size-2xl)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
              {title}
            </h1>
            {statusAction ? (
              <div className="shrink-0">{statusAction}</div>
            ) : null}
          </div>
          {permissionBanner ? <div>{permissionBanner}</div> : null}
        </div>
      </PageZone>

      <div className="flex flex-col gap-[var(--semantic-space-sectionGap)] md:flex-row">
        <PageZone name="Primary" className="min-w-0 flex-1 md:max-w-[960px]">
          <EntityTabs tabs={tabs} {...entityTabsProps} />
        </PageZone>

        <PageZone
          name="Secondary"
          className="md:w-[320px] md:shrink-0"
        >
          {secondary}
        </PageZone>
      </div>
    </div>
  );
}

export { T1DetailSkeleton };
