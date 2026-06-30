import * as React from "react";

import { cn } from "@/lib/utils";

const skeletonBaseClass =
  "animate-pulse rounded-[var(--primitive-radius-sm)] bg-[var(--semantic-color-surface-subtle)]";

export type SkeletonBlockProps = {
  className?: string;
};

function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={cn(skeletonBaseClass, className)} aria-hidden />;
}

export type BlockSkeletonProps = {
  className?: string;
  height?: string;
  width?: string;
};

function BlockSkeleton({
  className,
  height = "var(--primitive-space-4)",
  width = "100%",
}: BlockSkeletonProps) {
  return (
    <div
      className={cn(skeletonBaseClass, className)}
      style={{ height, width }}
      aria-hidden
    />
  );
}

export type TableRowSkeletonProps = {
  columns: number;
  rowSelectable?: boolean;
  className?: string;
};

function TableRowSkeleton({
  columns,
  rowSelectable = false,
  className,
}: TableRowSkeletonProps) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--semantic-color-surface-border)] last:border-b-0",
        className,
      )}
    >
      {rowSelectable ? (
        <td className="px-[var(--primitive-space-3)] py-[var(--primitive-space-3)]">
          <SkeletonBlock className="size-[var(--primitive-space-4)]" />
        </td>
      ) : null}
      {Array.from({ length: columns }).map((_, index) => (
        <td
          key={`skeleton-col-${index}`}
          className="px-[var(--primitive-space-4)] py-[var(--primitive-space-3)]"
        >
          <SkeletonBlock className="h-[var(--primitive-space-4)] w-full" />
        </td>
      ))}
    </tr>
  );
}

export type CardSkeletonVariant = "stat" | "entity";

export type CardSkeletonProps = {
  variant?: CardSkeletonVariant;
  className?: string;
};

function CardSkeleton({ variant = "stat", className }: CardSkeletonProps) {
  if (variant === "entity") {
    return (
      <div
        className={cn(
          "rounded-[var(--primitive-radius-md)] bg-[var(--semantic-color-surface-card)] p-[var(--semantic-space-cardPadding)]",
          "shadow-[var(--primitive-elevation-1)]",
          className,
        )}
        aria-hidden
      >
        <div className="flex gap-[var(--primitive-space-3)]">
          <SkeletonBlock className="size-[var(--primitive-space-10)] shrink-0 rounded-[var(--primitive-radius-full)]" />
          <div className="min-w-0 flex-1 space-y-[var(--primitive-space-2)]">
            <SkeletonBlock className="h-[var(--primitive-space-4)] w-3/5" />
            <SkeletonBlock className="h-[var(--primitive-space-4)] w-2/5" />
            <SkeletonBlock className="h-[var(--primitive-space-3)] w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[var(--primitive-radius-md)] bg-[var(--semantic-color-surface-card)] p-[var(--semantic-space-cardPadding)]",
        "shadow-[var(--primitive-elevation-1)]",
        className,
      )}
      aria-hidden
    >
      <SkeletonBlock className="h-[var(--primitive-space-4)] w-2/5" />
      <SkeletonBlock className="mt-[var(--primitive-space-2)] h-[var(--primitive-space-8)] w-3/5" />
    </div>
  );
}

export {
  SkeletonBlock,
  BlockSkeleton,
  TableRowSkeleton,
  CardSkeleton,
};
