import { cn } from "@/lib/utils";

export type StaleLeadIndicatorProps = {
  className?: string;
};

/** Warning dot for stale leads — docs/frontend/02-ux-guidelines-design-principles.md §1.5 */
function StaleLeadIndicator({ className }: StaleLeadIndicatorProps) {
  return (
    <span
      className={cn(
        "inline-block size-[8px] shrink-0 rounded-[var(--primitive-radius-full)]",
        "bg-[var(--semantic-color-status-warning)]",
        className,
      )}
      title="سرنخ بدون فعالیت در ۱۴ روز گذشته"
      aria-label="سرنخ راکد"
    />
  );
}

export { StaleLeadIndicator };
