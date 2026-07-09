"use client";

import * as React from "react";
import { BookOpen } from "lucide-react";

import {
  CourseFormFields,
  type CourseFormState,
} from "@/components/domain/course-form-fields";
import { FormDialog } from "@/components/domain/form-dialog";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import type { CourseRead, DepartmentRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export type CourseFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  state: CourseFormState;
  onChange: (patch: Partial<CourseFormState>) => void;
  onSubmit: () => void;
  submitLabel?: string;
  submitLoading?: boolean;
  submitDisabled?: boolean;
  departments: DepartmentRead[];
  courses: CourseRead[];
  currentCourseId?: number | null;
  fieldError?: ApiFieldError | null;
  formError?: ApiError | null;
};

function CourseAvatarPreview() {
  return (
    <div
      className={cn(
        "flex size-11 items-center justify-center rounded-[var(--primitive-radius-full)]",
        "border border-[var(--primitive-color-brand-200)] bg-gradient-to-br from-[var(--primitive-color-brand-50)] to-[var(--primitive-color-brand-100)]",
        "text-[var(--primitive-color-brand-700)] shadow-[0_2px_8px_rgba(232,119,34,0.12)]",
      )}
      aria-hidden
    >
      <BookOpen className="size-5 text-[var(--primitive-color-brand-600)]" />
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

function CourseFormDialog({
  open,
  onOpenChange,
  title,
  description,
  state,
  onChange,
  onSubmit,
  submitLabel = "ذخیره",
  submitLoading = false,
  submitDisabled = false,
  departments,
  courses,
  currentCourseId = null,
  fieldError = null,
  formError = null,
}: CourseFormDialogProps) {
  const resolvedDescription =
    description ?? "اطلاعات اصلی دوره و برنامه زمانی آن را وارد کنید.";

  const requiredFilled = [
    state.title.trim().length > 0,
    state.departmentId.trim().length > 0,
    state.price != null && state.price > 0,
  ].filter(Boolean).length;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={resolvedDescription}
      headerAdornment={<CourseAvatarPreview />}
      headerExtra={<RequiredFieldsProgress filled={requiredFilled} total={3} />}
      onSubmit={onSubmit}
      submitLabel={submitLabel}
      submitLoading={submitLoading}
      submitDisabled={submitDisabled}
      formError={formError}
    >
      <CourseFormFields
        state={state}
        onChange={onChange}
        departments={departments}
        courses={courses}
        currentCourseId={currentCourseId}
        fieldError={fieldError}
      />
    </FormDialog>
  );
}

export { CourseFormDialog };
