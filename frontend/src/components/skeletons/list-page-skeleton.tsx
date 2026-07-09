import * as React from "react";

import { PageZone } from "@/components/skeletons/page-zone";
import { cn } from "@/lib/utils";

export type ListPagePrimaryView = "responsive" | "table" | "cards";

export type ListPageSkeletonProps = {
  title: React.ReactNode;
  headerAction?: React.ReactNode;
  filterBar: React.ReactNode;
  table: React.ReactNode;
  cardList: React.ReactNode;
  primaryView?: ListPagePrimaryView;
  className?: string;
};

function ListPageSkeleton({
  title,
  headerAction,
  filterBar,
  table,
  cardList,
  primaryView = "responsive",
  className,
}: ListPageSkeletonProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1360px] flex-col gap-[var(--semantic-space-sectionGap)]",
        className,
      )}
    >
      <PageZone name="Header">
        <div className="flex flex-wrap items-center justify-between gap-[var(--primitive-space-4)]">
          <div>
            <h1 className="text-[length:var(--primitive-font-size-2xl)] font-[var(--primitive-font-weight-semibold)] tracking-tight text-[var(--semantic-color-text-primary)]">
              {title}
            </h1>
            <div className="mt-[var(--primitive-space-2)] h-0.5 w-8 rounded-full bg-[var(--primitive-color-brand-500)]" aria-hidden />
          </div>
          {headerAction ? (
            <div className="shrink-0">{headerAction}</div>
          ) : null}
        </div>
      </PageZone>

      <PageZone name="Filter-bar">{filterBar}</PageZone>

      <PageZone name="Primary">
        {primaryView === "cards" ? (
          cardList
        ) : primaryView === "table" ? (
          table
        ) : (
          <>
            <div className="hidden md:block">{table}</div>
            <div className="md:hidden">{cardList}</div>
          </>
        )}
      </PageZone>
    </div>
  );
}

export { ListPageSkeleton };
