import * as React from "react";

import type { PageZoneName } from "@/components/skeletons/types";
import { cn } from "@/lib/utils";

export type ZonePlaceholderProps = {
  zone: PageZoneName;
  label?: string;
  className?: string;
  children?: React.ReactNode;
};

function ZonePlaceholder({
  zone,
  label,
  className,
  children,
}: ZonePlaceholderProps) {
  return (
    <div
      data-zone-placeholder={zone}
      className={cn(
        "flex min-h-[var(--primitive-space-24)] flex-col items-center justify-center",
        "rounded-[var(--primitive-radius-md)] border-2 border-dashed border-[var(--semantic-color-surface-border)]",
        "bg-[var(--semantic-color-surface-subtle)] p-[var(--primitive-space-6)] text-center",
        className,
      )}
    >
      <span className="text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] uppercase tracking-wide text-[var(--semantic-color-text-secondary)]">
        {zone}
      </span>
      <span className="mt-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
        {label ?? `اسلات ${zone}`}
      </span>
      {children ? (
        <div className="mt-[var(--primitive-space-4)] w-full">{children}</div>
      ) : null}
    </div>
  );
}

export { ZonePlaceholder };
