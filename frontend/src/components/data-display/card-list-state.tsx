import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { EmptyState, type EmptyStateAction } from "@/components/feedback";
import { SkeletonBlock } from "@/components/feedback/skeleton";
import { cn } from "@/lib/utils";

function CardSkeleton() {
  return (
    <div
      className={cn(
        "rounded-[var(--primitive-radius-lg)] border border-[var(--semantic-color-surface-border)]",
        "bg-[var(--semantic-color-surface-card)] p-[var(--semantic-space-cardPadding)]",
      )}
      aria-hidden
    >
      <div className="flex items-start gap-[var(--primitive-space-3)]">
        <SkeletonBlock className="size-12 shrink-0 rounded-[var(--primitive-radius-lg)]" />
        <div className="flex-1 space-y-[var(--primitive-space-2)]">
          <SkeletonBlock className="h-4 w-2/3" />
          <SkeletonBlock className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-[var(--primitive-space-4)] grid grid-cols-2 gap-[var(--primitive-space-2)]">
        <SkeletonBlock className="h-10" />
        <SkeletonBlock className="h-10" />
      </div>
    </div>
  );
}

export type CardListStateProps = {
  /** Data is loading — renders skeleton cards. */
  loading: boolean;
  /** No rows after load — renders the designed EmptyState. */
  empty: boolean;
  emptyIcon: LucideIcon;
  emptyMessage: string;
  emptyAction?: EmptyStateAction;
  /** Number of skeleton cards while loading. Match the grid density. */
  skeletonCount?: number;
  /** Wrap skeletons/empty so they span a multi-column grid. */
  className?: string;
  children: React.ReactNode;
};

/**
 * Shared loading/empty chrome for card lists. Keeps every list page's card
 * view consistent: skeleton cards while loading, a designed empty state when
 * there is nothing to show, otherwise the actual cards.
 */
function CardListState({
  loading,
  empty,
  emptyIcon,
  emptyMessage,
  emptyAction,
  skeletonCount = 6,
  className,
  children,
}: CardListStateProps) {
  if (loading) {
    return (
      <>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </>
    );
  }

  if (empty) {
    return (
      <div className={cn("col-span-full", className)}>
        <EmptyState
          icon={emptyIcon}
          message={emptyMessage}
          action={emptyAction}
        />
      </div>
    );
  }

  return <>{children}</>;
}

export { CardListState };
