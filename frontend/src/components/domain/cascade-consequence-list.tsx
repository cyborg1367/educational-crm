import * as React from "react";

import { cn } from "@/lib/utils";

export type CascadeConsequenceListProps = {
  consequences: string[];
  className?: string;
};

function CascadeConsequenceList({
  consequences,
  className,
}: CascadeConsequenceListProps) {
  if (consequences.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-[var(--primitive-radius-md)]",
        "border border-[var(--semantic-color-status-danger-strong)]",
        "bg-[var(--semantic-color-surface-danger-subtle)]",
        "p-[var(--semantic-space-cardPadding)]",
        "shadow-[var(--semantic-confirmationTier-tier3-elevation)]",
        className,
      )}
    >
      <ul
        className={cn(
          "list-disc space-y-[var(--primitive-space-2)]",
          "ps-[var(--primitive-space-5)]",
          "text-[length:var(--primitive-font-size-sm)]",
          "leading-[var(--primitive-font-lineHeight-sm)]",
          "text-[var(--semantic-color-text-primary)]",
          "marker:text-[var(--semantic-color-status-danger-strong)]",
        )}
      >
        {consequences.map((consequence) => (
          <li key={consequence}>{consequence}</li>
        ))}
      </ul>
    </div>
  );
}

export { CascadeConsequenceList };
