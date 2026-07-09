"use client";

import * as React from "react";
import { Route } from "lucide-react";

import {
  RoadmapFormFields,
  type RoadmapFormState,
} from "@/components/domain/roadmap-form-fields";
import { FormDialog } from "@/components/domain/form-dialog";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import type { DepartmentRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export type RoadmapFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  state: RoadmapFormState;
  onChange: (patch: Partial<RoadmapFormState>) => void;
  onSubmit: () => void;
  submitLabel?: string;
  submitLoading?: boolean;
  submitDisabled?: boolean;
  departments: DepartmentRead[];
  fieldError?: ApiFieldError | null;
  formError?: ApiError | null;
};

function RoadmapAvatarPreview() {
  return (
    <div
      className={cn(
        "flex size-11 items-center justify-center rounded-[var(--primitive-radius-full)]",
        "border border-[var(--primitive-color-brand-200)] bg-gradient-to-br from-[var(--primitive-color-brand-50)] to-[var(--primitive-color-brand-100)]",
        "text-[var(--primitive-color-brand-700)] shadow-[0_2px_8px_rgba(232,119,34,0.12)]",
      )}
      aria-hidden
    >
      <Route className="size-5 text-[var(--primitive-color-brand-600)]" />
    </div>
  );
}

function RequiredFieldsProgress({
  filled,
  total,
}: {
  filled: number;
  total: number;
}) {
  const complete = filled >= total;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-[var(--primitive-space-2)] rounded-[var(--primitive-radius-full)]",
        "border px-[var(--primitive-space-3)] py-[var(--primitive-space-1)]",
        "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)]",
        complete
          ? "border-[var(--semantic-color-status-success)]/30 bg-[var(--semantic-color-status-success)]/8 text-[var(--semantic-color-status-success)]"
          : "border-[var(--primitive-color-brand-200)] bg-[var(--semantic-color-surface-card)]/80 text-[var(--semantic-color-text-secondary)]",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          complete
            ? "bg-[var(--semantic-color-status-success)]"
            : "bg-[var(--primitive-color-brand-500)]",
        )}
        aria-hidden
      />
      {complete
        ? "فیلدهای الزامی تکمیل شد"
        : `${filled} از ${total} فیلد الزامی`}
    </div>
  );
}

function RoadmapFormDialog({
  open,
  onOpenChange,
  title = "افزودن نقشه راه",
  description,
  state,
  onChange,
  onSubmit,
  submitLabel = "ثبت و ادامه",
  submitLoading = false,
  submitDisabled = false,
  departments,
  fieldError = null,
  formError = null,
}: RoadmapFormDialogProps) {
  const resolvedDescription =
    description ??
    "دپارتمان را انتخاب کنید و نام مسیر را مشخص کنید؛ مراحل به‌صورت خودکار از دوره‌های فعال دپارتمان ساخته می‌شوند.";

  const requiredFilled = [
    state.departmentId.trim().length > 0,
    state.name.trim().length > 0,
  ].filter(Boolean).length;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={resolvedDescription}
      headerAdornment={<RoadmapAvatarPreview />}
      headerExtra={<RequiredFieldsProgress filled={requiredFilled} total={2} />}
      onSubmit={onSubmit}
      submitLabel={submitLabel}
      submitLoading={submitLoading}
      submitDisabled={submitDisabled}
      formError={formError}
    >
      <RoadmapFormFields
        state={state}
        onChange={onChange}
        departments={departments}
        fieldError={fieldError}
      />
    </FormDialog>
  );
}

export { RoadmapFormDialog };
