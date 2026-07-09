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
        "rounded-[var(--primitive-radius-lg)]",
        "border border-[var(--semantic-color-status-danger)]/20",
        "bg-[var(--semantic-color-surface-danger-subtle)]",
        "px-[var(--primitive-space-4)] py-[var(--primitive-space-3)]",
        className,
      )}
    >
      <p className="mb-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-semibold)] tracking-wide text-[var(--semantic-color-status-danger-strong)]">
        پیامدها
      </p>
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
