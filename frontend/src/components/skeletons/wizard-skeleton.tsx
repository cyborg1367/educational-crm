"use client";

import * as React from "react";

import { Stepper, type StepperStep } from "@/components/domain/stepper";
import { PageZone } from "@/components/skeletons/page-zone";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WizardSkeletonProps = {
  title: React.ReactNode;
  steps: StepperStep[];
  currentStep: number;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  isLastStep?: boolean;
  className?: string;
};

function WizardSkeleton({
  title,
  steps,
  currentStep,
  children,
  onBack,
  onNext,
  backLabel = "بازگشت",
  nextLabel = "بعدی",
  nextDisabled = false,
  isLastStep = false,
  className,
}: WizardSkeletonProps) {
  const showBack = currentStep > 0 && onBack;

  return (
    <div
      className={cn(
        "flex min-h-full flex-col gap-[var(--semantic-space-sectionGap)]",
        className,
      )}
    >
      <PageZone name="Header">
        <div className="flex flex-col gap-[var(--primitive-space-6)]">
          <h1 className="text-[length:var(--primitive-font-size-2xl)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
            {title}
          </h1>
          <Stepper steps={steps} currentStep={currentStep} />
        </div>
      </PageZone>

      <PageZone name="Primary" className="mx-auto w-full max-w-[640px] flex-1">
        {children}
      </PageZone>

      <PageZone
        name="Action-bar"
        className={cn(
          "sticky bottom-0 z-[var(--primitive-zIndex-dropdown)]",
          "border-t border-[var(--semantic-color-surface-border)]",
          "bg-[var(--semantic-color-surface-card)]",
          "px-[var(--semantic-space-pageMargin)] py-[var(--primitive-space-4)]",
          "-mx-[var(--semantic-space-pageMargin)]",
        )}
      >
        <div className="mx-auto flex w-full max-w-[640px] items-center justify-between gap-[var(--primitive-space-4)]">
          <div>
            {showBack ? (
              <Button type="button" variant="secondary" onClick={onBack}>
                {backLabel}
              </Button>
            ) : (
              <span aria-hidden className="inline-block w-px" />
            )}
          </div>
          {onNext ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={onNext}
              disabled={nextDisabled}
            >
              {isLastStep ? "ثبت" : nextLabel}
            </Button>
          ) : null}
        </div>
      </PageZone>
    </div>
  );
}

export { WizardSkeleton };
