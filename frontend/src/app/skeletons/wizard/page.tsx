"use client";

import * as React from "react";

import {
  SkeletonDemoShell,
  WizardSkeleton,
  ZonePlaceholder,
} from "@/components/skeletons";

const WIZARD_STEPS = [
  { label: "انتخاب کلاس" },
  { label: "بررسی قیمت" },
  { label: "تقسیم اقساط" },
];

export default function WizardSkeletonDemo() {
  const [currentStep, setCurrentStep] = React.useState(0);

  return (
    <SkeletonDemoShell
      title="WizardSkeleton"
      description="جریان چندمرحله‌ای — محتوای فرم در Primary با عرض حداکثر ۶۴۰px و نوار Action-bar چسبان."
      zones="Header (Stepper) · Primary · Action-bar"
    >
      <WizardSkeleton
        title="ایجاد ثبت‌نام"
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        isLastStep={currentStep === WIZARD_STEPS.length - 1}
        onBack={() => setCurrentStep((step) => Math.max(0, step - 1))}
        onNext={() =>
          setCurrentStep((step) => Math.min(WIZARD_STEPS.length - 1, step + 1))
        }
      >
        <ZonePlaceholder
          zone="Primary"
          label={`محتوای مرحله ${currentStep + 1}: ${WIZARD_STEPS[currentStep]?.label}`}
        />
      </WizardSkeleton>
    </SkeletonDemoShell>
  );
}
