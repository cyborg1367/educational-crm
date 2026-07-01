import * as React from "react";

import { PageZone } from "@/components/skeletons/page-zone";
import { cn } from "@/lib/utils";

export type ListPageSkeletonProps = {
  title: React.ReactNode;
  headerAction?: React.ReactNode;
  filterBar: React.ReactNode;
  table: React.ReactNode;
  cardList: React.ReactNode;
  className?: string;
};

function ListPageSkeleton({
  title,
  headerAction,
  filterBar,
  table,
  cardList,
  className,
}: ListPageSkeletonProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1280px] flex-col gap-[var(--semantic-space-sectionGap)]",
        className,
      )}
    >
      <PageZone name="Header">
        <div className="flex flex-wrap items-center justify-between gap-[var(--primitive-space-4)]">
          <h1 className="text-[length:var(--primitive-font-size-2xl)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
            {title}
          </h1>
          {headerAction ? (
            <div className="shrink-0">{headerAction}</div>
          ) : null}
        </div>
      </PageZone>

      <PageZone name="Filter-bar">{filterBar}</PageZone>

      <PageZone name="Primary">
        <div className="hidden md:block">{table}</div>
        <div className="md:hidden">{cardList}</div>
      </PageZone>
    </div>
  );
}

export { ListPageSkeleton };
