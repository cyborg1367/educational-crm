import { ArrowDown, ArrowUp } from "lucide-react";

import { formatCount, formatToman } from "@/lib/locale/number";
import { cn } from "@/lib/utils";

export type StatCardTrend = {
  direction: "up" | "down";
  percentage: number;
};

export type StatCardProps = {
  label: string;
  value: number | string;
  valueFormat?: "count" | "toman" | "text";
  trend?: StatCardTrend;
  className?: string;
};

function formatStatValue(
  value: number | string,
  valueFormat: StatCardProps["valueFormat"],
): string {
  if (typeof value === "string" || valueFormat === "text") {
    return typeof value === "string" ? value : formatCount(value);
  }
  if (valueFormat === "toman") {
    return formatToman(value, { suffix: true });
  }
  return formatCount(value);
}

function StatCard({
  label,
  value,
  valueFormat = "count",
  trend,
  className,
}: StatCardProps) {
  const displayValue = formatStatValue(value, valueFormat);
  const trendIsPositive = trend?.direction === "up";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--primitive-radius-lg)]",
        "border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)]",
        "p-[var(--semantic-space-cardPadding)]",
        "shadow-[var(--primitive-elevation-1)]",
        "transition-shadow duration-[var(--primitive-motion-duration-base)] hover:shadow-[var(--primitive-elevation-2)]",
        className,
      )}
    >
      <div
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-l from-[var(--primitive-color-brand-500)] to-[var(--primitive-color-brand-300)]"
        aria-hidden
      />
      <p className="text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-secondary)]">
        {label}
      </p>
      <div className="mt-[var(--primitive-space-3)] flex flex-wrap items-end gap-[var(--primitive-space-2)]">
        <p className="text-[length:var(--primitive-font-size-2xl)] font-[var(--primitive-font-weight-semibold)] leading-[var(--primitive-font-lineHeight-2xl)] tracking-tight text-[var(--semantic-color-text-primary)]">
          {displayValue}
        </p>
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-[var(--primitive-space-1)] pb-[var(--primitive-space-1)]",
              "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)]",
              trendIsPositive
                ? "text-[var(--semantic-color-status-success)]"
                : "text-[var(--semantic-color-status-danger)]",
            )}
          >
            {trendIsPositive ? (
              <ArrowUp
                className="size-[var(--primitive-space-4)]"
                aria-hidden
              />
            ) : (
              <ArrowDown
                className="size-[var(--primitive-space-4)]"
                aria-hidden
              />
            )}
            <span>{formatCount(trend.percentage)}٪</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export { StatCard };
