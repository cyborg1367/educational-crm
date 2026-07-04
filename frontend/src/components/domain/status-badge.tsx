import * as React from "react";

import { Badge } from "@/components/primitives/badge";
import {
  highUrgencyStatusValues,
  lookupStatusToken,
  statusTokenToCssVar,
} from "@/generated/status-map";
import { statusDisplayLabel } from "@/lib/terminology";
import { cn } from "@/lib/utils";

export type StatusBadgeDomain =
  | "person"
  | "enrollment"
  | "invoice"
  | "installment"
  | "task"
  | "class"
  | "journey"
  | "consultation";

export type StatusBadgeProps = {
  domain: StatusBadgeDomain;
  value: string;
  className?: string;
};

const NEUTRAL_FALLBACK_CLASSES = [
  "bg-[var(--primitive-color-neutral-100)]",
  "text-[var(--semantic-color-text-secondary)]",
].join(" ");

function StatusBadge({ domain, value, className }: StatusBadgeProps) {
  const tokenPath = lookupStatusToken(domain, value);
  const displayLabel = statusDisplayLabel(domain, value);
  const isHighUrgency = (highUrgencyStatusValues as readonly string[]).includes(
    value,
  );

  if (!tokenPath && process.env.NODE_ENV === "development") {
    console.warn(
      `[StatusBadge] Missing statusMap entry for "${domain}.${value}" — rendering neutral fallback.`,
    );
  }

  const statusColorVar = tokenPath
    ? statusTokenToCssVar(tokenPath)
    : "var(--semantic-color-status-neutral)";

  return (
    <Badge
      className={cn(
        tokenPath
          ? [
              "gap-[var(--primitive-space-1)]",
              "text-[length:var(--primitive-font-size-xs)]",
              "[background-color:color-mix(in_srgb,var(--semantic-color-surface-subtle)_88%,var(--semantic-color-surface-border))]",
            ].join(" ")
          : NEUTRAL_FALLBACK_CLASSES,
        className,
      )}
      style={tokenPath ? { color: statusColorVar } : undefined}
    >
      {isHighUrgency ? (
        <span
          aria-hidden
          className="size-[6px] shrink-0 rounded-[var(--primitive-radius-full)] bg-[var(--semantic-confirmationTier-tier3-accent)]"
        />
      ) : null}
      {displayLabel}
    </Badge>
  );
}

export { StatusBadge };
