import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type StepperStep = {
  label: string;
};

export type StepperProps = {
  steps: StepperStep[];
  /** Zero-based index of the active step. */
  currentStep: number;
  /** Force compact dot layout (e.g. preview in a narrow container). */
  compact?: boolean;
  className?: string;
};

function Stepper({ steps, currentStep, compact = false, className }: StepperProps) {
  if (steps.length === 0) {
    return null;
  }

  const clampedCurrent = Math.min(Math.max(currentStep, 0), steps.length - 1);

  return (
    <nav aria-label="پیشرفت مراحل" className={cn("w-full", className)}>
      {/* Compact dot indicator — below tablet (768px) */}
      <ol
        className={cn(
          "flex items-center justify-center gap-[var(--primitive-space-2)]",
          !compact && "md:hidden",
        )}
      >
        {steps.map((step, index) => {
          const isComplete = index < clampedCurrent;
          const isCurrent = index === clampedCurrent;

          return (
            <li key={step.label} className="flex items-center">
              <span
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${step.label}${isComplete ? " (تکمیل‌شده)" : isCurrent ? " (فعلی)" : ""}`}
                className={cn(
                  "block rounded-[var(--primitive-radius-full)] transition-colors",
                  isCurrent
                    ? "size-[10px] bg-[var(--semantic-color-action-primary)]"
                    : isComplete
                      ? "size-[8px] bg-[var(--semantic-color-status-success)]"
                      : "size-[8px] bg-[var(--primitive-color-neutral-300)]",
                )}
              />
            </li>
          );
        })}
      </ol>

      {/* Horizontal step labels — desktop / tablet */}
      <ol
        className={cn(
          "items-center gap-[var(--primitive-space-2)]",
          compact ? "hidden" : "hidden md:flex",
        )}
      >
        {steps.map((step, index) => {
          const isComplete = index < clampedCurrent;
          const isCurrent = index === clampedCurrent;
          const isUpcoming = index > clampedCurrent;

          return (
            <li
              key={step.label}
              className={cn(
                "flex min-w-0 flex-1 items-center",
                index < steps.length - 1 && "gap-[var(--primitive-space-2)]",
              )}
            >
              <div
                className={cn(
                  "flex min-w-0 items-center gap-[var(--primitive-space-2)]",
                  isUpcoming && "opacity-60",
                )}
              >
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "flex size-[var(--primitive-space-6)] shrink-0 items-center justify-center",
                    "rounded-[var(--primitive-radius-full)]",
                    "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)]",
                    isComplete &&
                      "bg-[var(--semantic-color-status-success)] text-[var(--semantic-color-text-inverse)]",
                    isCurrent &&
                      "bg-[var(--semantic-color-action-primary)] text-[var(--semantic-color-text-inverse)]",
                    isUpcoming &&
                      "border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] text-[var(--semantic-color-text-secondary)]",
                  )}
                >
                  {isComplete ? (
                    <Check className="size-[var(--primitive-space-4)]" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    "truncate text-[length:var(--primitive-font-size-sm)]",
                    isCurrent
                      ? "font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]"
                      : "font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-secondary)]",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "h-px min-w-[var(--primitive-space-4)] flex-1",
                    isComplete
                      ? "bg-[var(--semantic-color-status-success)]"
                      : "bg-[var(--semantic-color-surface-border)]",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { Stepper };
